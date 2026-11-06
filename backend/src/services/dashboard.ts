import { Prisma, EstadoSeguimiento, Termometro } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { estadoAreaDesdePromedio, mesLabel } from './scoring';

export interface DashboardFilters {
  cicloIds?: string[];
  areaIds?: string[];
  categoriaIds?: string[];
  termometros?: Termometro[];
  estados?: EstadoSeguimiento[];
  fechaDesde?: string;
  fechaHasta?: string;
  anios?: number[];
  meses?: number[];
}

function applyIn<T extends string>(
  where: Prisma.HallazgoWhereInput,
  key: 'cicloId' | 'areaId' | 'categoriaId',
  ids?: string[],
) {
  if (!ids?.length) return;
  if (ids.length === 1) (where as Record<string, unknown>)[key] = ids[0];
  else (where as Record<string, unknown>)[key] = { in: ids };
}

function buildWhere(f: DashboardFilters): Prisma.HallazgoWhereInput {
  const where: Prisma.HallazgoWhereInput = {};

  applyIn(where, 'cicloId', f.cicloIds);
  applyIn(where, 'areaId', f.areaIds);
  applyIn(where, 'categoriaId', f.categoriaIds);

  if (f.termometros?.length === 1) where.termometro = f.termometros[0];
  else if (f.termometros && f.termometros.length > 1) where.termometro = { in: f.termometros };

  if (f.estados?.length === 1) where.estadoSeguimiento = f.estados[0];
  else if (f.estados && f.estados.length > 1) where.estadoSeguimiento = { in: f.estados };

  const anios = (f.anios || []).filter((n) => Number.isFinite(n));
  const meses = (f.meses || []).filter((n) => n >= 1 && n <= 12);

  if (anios.length && meses.length) {
    const ranges = anios.flatMap((y) =>
      meses.map((m) => ({
        fecha: {
          gte: new Date(Date.UTC(y, m - 1, 1)),
          lte: new Date(Date.UTC(y, m, 0, 23, 59, 59)),
        },
      })),
    );
    if (ranges.length === 1) Object.assign(where, ranges[0]);
    else where.OR = ranges;
  } else if (anios.length) {
    const ranges = anios.map((y) => ({
      fecha: {
        gte: new Date(Date.UTC(y, 0, 1)),
        lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
      },
    }));
    if (ranges.length === 1) Object.assign(where, ranges[0]);
    else where.OR = ranges;
  } else if (meses.length) {
    // Sin año: buscar esos meses en un rango amplio (últimos años típicos)
    const years = [2024, 2025, 2026, 2027];
    where.OR = years.flatMap((y) =>
      meses.map((m) => ({
        fecha: {
          gte: new Date(Date.UTC(y, m - 1, 1)),
          lte: new Date(Date.UTC(y, m, 0, 23, 59, 59)),
        },
      })),
    );
  } else if (f.fechaDesde || f.fechaHasta) {
    where.fecha = {};
    if (f.fechaDesde) where.fecha.gte = new Date(f.fechaDesde);
    if (f.fechaHasta) where.fecha.lte = new Date(f.fechaHasta);
  }

  return where;
}

export async function getDashboardData(filters: DashboardFilters) {
  const where = buildWhere(filters);

  const hallazgos = await prisma.hallazgo.findMany({
    where,
    include: {
      area: true,
      categoria: true,
      subcategoria: true,
      ciclo: true,
      responsables: { include: { responsable: true } },
    },
    orderBy: [{ fecha: 'desc' }, { termometro: 'asc' }],
  });

  const total = hallazgos.length;

  const porCategoria = new Map<string, number>();
  const porSubcategoria = new Map<string, number>();
  const porTermometro: Record<Termometro, number> = { CRITICO: 0, MEDIO: 0, POSITIVO: 0 };
  const porEstado: Record<EstadoSeguimiento, number> = {
    ABIERTO: 0,
    EN_PROCESO: 0,
    CERRADO: 0,
  };
  const porArea = new Map<string, { areaId: string; area: string; suma: number; n: number }>();

  for (const h of hallazgos) {
    porCategoria.set(h.categoria.name, (porCategoria.get(h.categoria.name) || 0) + 1);
    const subName = h.subcategoria?.name || 'Sin subcategoría';
    porSubcategoria.set(subName, (porSubcategoria.get(subName) || 0) + 1);
    porTermometro[h.termometro] += 1;
    porEstado[h.estadoSeguimiento] += 1;

    const cur = porArea.get(h.areaId) || {
      areaId: h.areaId,
      area: h.area.name,
      suma: 0,
      n: 0,
    };
    cur.suma += h.calificacion;
    cur.n += 1;
    porArea.set(h.areaId, cur);
  }

  // Todas las áreas activas (o solo las filtradas); las sin hallazgos quedan en 0
  const areasCatalogo = filters.areaIds?.length
    ? await prisma.area.findMany({
        where: { id: { in: filters.areaIds } },
        orderBy: { sortOrder: 'asc' },
      })
    : await prisma.area.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });

  for (const a of areasCatalogo) {
    if (!porArea.has(a.id)) {
      porArea.set(a.id, { areaId: a.id, area: a.name, suma: 0, n: 0 });
    }
  }

  const termometroAreas = await Promise.all(
    [...porArea.values()].map(async (a) => {
      const calificacion = a.n ? Math.round((a.suma / a.n) * 100) / 100 : 0;
      return {
        areaId: a.areaId,
        area: a.area,
        calificacion,
        estado: a.n ? await estadoAreaDesdePromedio(calificacion) : 'Sin datos',
        hallazgos: a.n,
      };
    }),
  );
  termometroAreas.sort((a, b) => {
    const aSin = a.hallazgos === 0;
    const bSin = b.hallazgos === 0;
    if (aSin !== bSin) return aSin ? 1 : -1;
    if (a.calificacion !== b.calificacion) return a.calificacion - b.calificacion;
    return a.area.localeCompare(b.area);
  });

  // Promedio solo con áreas que sí tienen hallazgos en el filtro
  const areasConDatos = termometroAreas.filter((a) => a.hallazgos > 0);
  const promedioGeneral =
    areasConDatos.length > 0
      ? Math.round(
          (areasConDatos.reduce((s, a) => s + a.calificacion, 0) / areasConDatos.length) * 100,
        ) / 100
      : 0;

  // Comparativo: si hay mes filtrado, comparar con todo lo anterior a ese mes
  let comparativoPrevio: {
    label: string;
    abierto: number;
    enProceso: number;
    cerrado: number;
    total: number;
  } | null = null;

  const aniosSel = (filters.anios || []).slice().sort();
  const mesesSel = (filters.meses || []).slice().sort((a, b) => a - b);
  if (aniosSel.length === 1 && mesesSel.length === 1) {
    const y = aniosSel[0];
    const m = mesesSel[0];
    const prevWhere: Prisma.HallazgoWhereInput = {
      ...buildWhere({
        ...filters,
        anios: undefined,
        meses: undefined,
        fechaDesde: undefined,
        fechaHasta: undefined,
      }),
      fecha: { lt: new Date(Date.UTC(y, m - 1, 1)) },
    };

    const previos = await prisma.hallazgo.groupBy({
      by: ['estadoSeguimiento'],
      where: prevWhere,
      _count: { _all: true },
    });

    const abierto = previos.find((p) => p.estadoSeguimiento === 'ABIERTO')?._count._all || 0;
    const enProceso = previos.find((p) => p.estadoSeguimiento === 'EN_PROCESO')?._count._all || 0;
    const cerrado = previos.find((p) => p.estadoSeguimiento === 'CERRADO')?._count._all || 0;

    comparativoPrevio = {
      label: 'Periodos anteriores',
      abierto,
      enProceso,
      cerrado,
      total: abierto + enProceso + cerrado,
    };
  }

  const mapDetalle = (h: (typeof hallazgos)[number]) => ({
    id: h.id,
    fecha: h.fecha,
    area: h.area.name,
    categoria: h.categoria.name,
    subcategoria: h.subcategoria?.name || null,
    observacion: h.observacion,
    estado: h.estadoSeguimiento,
  });

  const criticos = hallazgos.filter((h) => h.termometro === 'CRITICO').map(mapDetalle);
  const positivos = hallazgos.filter((h) => h.termometro === 'POSITIVO').map(mapDetalle);

  const mediosAgrupados = new Map<string, { tema: string; count: number; items: string[] }>();
  for (const h of hallazgos.filter((x) => x.termometro === 'MEDIO')) {
    const tema = h.subcategoria?.name || h.categoria.name;
    const cur = mediosAgrupados.get(tema) || { tema, count: 0, items: [] };
    cur.count += 1;
    if (cur.items.length < 8) cur.items.push(h.observacion.slice(0, 180));
    mediosAgrupados.set(tema, cur);
  }

  return {
    filtrosAplicados: filters,
    total,
    categorias: [...porCategoria.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    subcategorias: [...porSubcategoria.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    termometro: porTermometro,
    estados: porEstado,
    termometroAreas,
    promedioGeneral,
    estadoPromedio: await estadoAreaDesdePromedio(promedioGeneral),
    comparativoPrevio,
    criticos,
    positivos,
    mediosAgrupados: [...mediosAgrupados.values()].sort((a, b) => b.count - a.count),
    hallazgos,
  };
}

export async function getResumenMensual(anio: number, mes: number, cicloId?: string) {
  return getDashboardData({
    anios: [anio],
    meses: [mes],
    cicloIds: cicloId ? [cicloId] : undefined,
  });
}

export interface TendenciaFilters {
  anioDesde?: number;
  anioHasta?: number;
  /** Una o varias áreas; vacío = todas */
  areaIds?: string[];
  /** Uno o varios ciclos; vacío = todos */
  cicloIds?: string[];
  /** mes (default) | semana */
  granularidad?: 'mes' | 'semana';
}

function periodKey(fecha: Date, granularidad: 'mes' | 'semana'): string {
  const y = fecha.getUTCFullYear();
  const m = fecha.getUTCMonth() + 1;
  if (granularidad === 'semana') {
    // Semana ISO aproximada por UTC (lunes = inicio)
    const tmp = new Date(Date.UTC(y, fecha.getUTCMonth(), fecha.getUTCDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-S${String(week).padStart(2, '0')}`;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Rango UTC que agrupa la misma clave que usa la gráfica (2026-07 o 2026-S29). */
export function periodoBounds(key: string): { gte: Date; lte: Date } | null {
  const month = /^(\d{4})-(\d{2})$/.exec(key);
  if (month) {
    const y = Number(month[1]);
    const m = Number(month[2]);
    if (m < 1 || m > 12) return null;
    return {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
    };
  }
  const week = /^(\d{4})-S(\d{2})$/.exec(key);
  if (week) {
    const y = Number(week[1]);
    const w = Number(week[2]);
    if (w < 1 || w > 53) return null;
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - day + 1 + (w - 1) * 7);
    const end = new Date(monday);
    end.setUTCDate(monday.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return { gte: monday, lte: end };
  }
  return null;
}

function periodLabel(key: string, granularidad: 'mes' | 'semana'): string {
  if (granularidad === 'semana') {
    const [y, s] = key.split('-');
    return `${s}/${y.slice(2)}`;
  }
  const [y, m] = key.split('-').map(Number);
  return mesLabel(y, m);
}

export async function getTendenciaHistorica(filters: TendenciaFilters) {
  const granularidad = filters.granularidad === 'semana' ? 'semana' : 'mes';
  const now = new Date();
  const anioHasta = filters.anioHasta ?? now.getUTCFullYear();
  const anioDesde = filters.anioDesde ?? anioHasta;

  const areaIds = (filters.areaIds || []).filter(Boolean);
  const cicloIds = (filters.cicloIds || []).filter(Boolean);

  const where: Prisma.HallazgoWhereInput = {
    fecha: {
      gte: new Date(Date.UTC(anioDesde, 0, 1)),
      lte: new Date(Date.UTC(anioHasta, 11, 31, 23, 59, 59)),
    },
  };
  if (cicloIds.length === 1) where.cicloId = cicloIds[0];
  else if (cicloIds.length > 1) where.cicloId = { in: cicloIds };
  if (areaIds.length === 1) where.areaId = areaIds[0];
  else if (areaIds.length > 1) where.areaId = { in: areaIds };

  const hallazgos = await prisma.hallazgo.findMany({
    where,
    select: {
      fecha: true,
      calificacion: true,
      areaId: true,
      area: { select: { id: true, name: true } },
    },
    orderBy: { fecha: 'asc' },
  });

  type Bucket = {
    key: string;
    suma: number;
    n: number;
    porArea: Map<string, { areaId: string; area: string; suma: number; n: number }>;
  };

  const buckets = new Map<string, Bucket>();

  for (const h of hallazgos) {
    const key = periodKey(new Date(h.fecha), granularidad);
    let b = buckets.get(key);
    if (!b) {
      b = { key, suma: 0, n: 0, porArea: new Map() };
      buckets.set(key, b);
    }
    b.suma += h.calificacion;
    b.n += 1;
    const a = b.porArea.get(h.areaId) || {
      areaId: h.areaId,
      area: h.area.name,
      suma: 0,
      n: 0,
    };
    a.suma += h.calificacion;
    a.n += 1;
    b.porArea.set(h.areaId, a);
  }

  const periodos = [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((b) => {
      const promedio = b.n ? Math.round((b.suma / b.n) * 100) / 100 : 0;
      const areas = [...b.porArea.values()]
        .map((a) => ({
          areaId: a.areaId,
          area: a.area,
          promedio: Math.round((a.suma / a.n) * 100) / 100,
          hallazgos: a.n,
        }))
        .sort((x, y) => x.area.localeCompare(y.area));
      return {
        key: b.key,
        label: periodLabel(b.key, granularidad),
        promedio,
        hallazgos: b.n,
        areas,
      };
    });

  // Series: General + áreas con datos (máx. 6 si no hay filtro de área)
  const areaNames = new Map<string, string>();
  for (const p of periodos) {
    for (const a of p.areas) areaNames.set(a.areaId, a.area);
  }

  const seriesIds =
    areaIds.length > 0
      ? areaIds.filter((id) => areaNames.has(id))
      : [...areaNames.entries()]
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([id]) => id);

  const series = [
    {
      id: 'general',
      nombre: 'General',
      puntos: periodos.map((p) => ({
        key: p.key,
        label: p.label,
        valor: p.promedio,
        hallazgos: p.hallazgos,
      })),
    },
    ...seriesIds.map((id) => ({
      id,
      nombre: areaNames.get(id) || id,
      puntos: periodos.map((p) => {
        const a = p.areas.find((x) => x.areaId === id);
        return {
          key: p.key,
          label: p.label,
          valor: a?.promedio ?? null,
          hallazgos: a?.hallazgos ?? 0,
        };
      }),
    })),
  ];

  const primero = periodos[0];
  const ultimo = periodos[periodos.length - 1];
  let evolucion: {
    desde: string;
    hasta: string;
    promedioInicial: number;
    promedioActual: number;
    delta: number;
    tendencia: 'mejoro' | 'empeoro' | 'estable' | 'sin_datos';
  } | null = null;

  if (primero && ultimo) {
    const delta = Math.round((ultimo.promedio - primero.promedio) * 100) / 100;
    evolucion = {
      desde: primero.label,
      hasta: ultimo.label,
      promedioInicial: primero.promedio,
      promedioActual: ultimo.promedio,
      delta,
      tendencia: Math.abs(delta) < 0.5 ? 'estable' : delta > 0 ? 'mejoro' : 'empeoro',
    };
  }

  // Comparativo por área: primer periodo con datos vs último
  const areasEvolucion = [...areaNames.entries()]
    .map(([areaId, area]) => {
      const conDatos = periodos
        .map((p) => p.areas.find((a) => a.areaId === areaId))
        .filter(Boolean) as { promedio: number; hallazgos: number }[];
      if (conDatos.length < 1) {
        return {
          areaId,
          area,
          promedioInicial: null as number | null,
          promedioActual: null as number | null,
          delta: null as number | null,
          tendencia: 'sin_datos' as const,
        };
      }
      const ini = conDatos[0].promedio;
      const act = conDatos[conDatos.length - 1].promedio;
      const delta = Math.round((act - ini) * 100) / 100;
      return {
        areaId,
        area,
        promedioInicial: ini,
        promedioActual: act,
        delta,
        tendencia:
          Math.abs(delta) < 0.5
            ? ('estable' as const)
            : delta > 0
              ? ('mejoro' as const)
              : ('empeoro' as const),
      };
    })
    .sort((a, b) => a.area.localeCompare(b.area));

  return {
    filtros: {
      anioDesde,
      anioHasta,
      areaIds,
      cicloIds,
      granularidad,
    },
    periodos,
    series,
    evolucion,
    areasEvolucion,
    totalHallazgos: hallazgos.length,
  };
}
