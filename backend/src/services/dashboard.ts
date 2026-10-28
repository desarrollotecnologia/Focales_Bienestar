import { Prisma, EstadoSeguimiento, Termometro } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { estadoAreaDesdePromedio } from './scoring';

export interface DashboardFilters {
  cicloId?: string;
  areaId?: string;
  categoriaId?: string;
  termometro?: Termometro;
  estado?: EstadoSeguimiento;
  fechaDesde?: string;
  fechaHasta?: string;
  anio?: number;
  mes?: number;
}

function buildWhere(f: DashboardFilters): Prisma.HallazgoWhereInput {
  const where: Prisma.HallazgoWhereInput = {};

  if (f.cicloId) where.cicloId = f.cicloId;
  if (f.areaId) where.areaId = f.areaId;
  if (f.categoriaId) where.categoriaId = f.categoriaId;
  if (f.termometro) where.termometro = f.termometro;
  if (f.estado) where.estadoSeguimiento = f.estado;

  if (f.anio && f.mes) {
    const start = new Date(Date.UTC(f.anio, f.mes - 1, 1));
    const end = new Date(Date.UTC(f.anio, f.mes, 0));
    where.fecha = { gte: start, lte: end };
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

  const termometroAreas = [...porArea.values()]
    .map((a) => {
      const calificacion = a.n ? Math.round((a.suma / a.n) * 100) / 100 : 0;
      return {
        areaId: a.areaId,
        area: a.area,
        calificacion,
        estado: estadoAreaDesdePromedio(calificacion),
        hallazgos: a.n,
      };
    })
    .sort((a, b) => a.area.localeCompare(b.area));

  const promedioGeneral =
    termometroAreas.length > 0
      ? Math.round(
          (termometroAreas.reduce((s, a) => s + a.calificacion, 0) / termometroAreas.length) * 100,
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

  if (filters.anio && filters.mes) {
    const prevWhere: Prisma.HallazgoWhereInput = {
      ...buildWhere({ ...filters, anio: undefined, mes: undefined, fechaDesde: undefined, fechaHasta: undefined }),
      fecha: { lt: new Date(Date.UTC(filters.anio, filters.mes - 1, 1)) },
    };
    if (filters.cicloId) prevWhere.cicloId = filters.cicloId;

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

  const criticos = hallazgos
    .filter((h) => h.termometro === 'CRITICO')
    .map((h) => ({
      id: h.id,
      fecha: h.fecha,
      area: h.area.name,
      categoria: h.categoria.name,
      subcategoria: h.subcategoria?.name || null,
      observacion: h.observacion,
      estado: h.estadoSeguimiento,
    }));

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
    estadoPromedio: estadoAreaDesdePromedio(promedioGeneral),
    comparativoPrevio,
    criticos,
    mediosAgrupados: [...mediosAgrupados.values()].sort((a, b) => b.count - a.count),
    hallazgos,
  };
}

export async function getResumenMensual(anio: number, mes: number, cicloId?: string) {
  return getDashboardData({ anio, mes, cicloId });
}
