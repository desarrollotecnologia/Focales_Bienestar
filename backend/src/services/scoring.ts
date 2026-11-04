import { Termometro } from '@prisma/client';
import { prisma } from '../lib/prisma';

/** Valores por defecto (Excel) si la BD aún no tiene escala. */
export const TERMOMETRO_PTS_FALLBACK: Record<Termometro, number> = {
  CRITICO: 20,
  MEDIO: 60,
  POSITIVO: 100,
};

export const TERMOMETRO_DESC_FALLBACK: Record<Termometro, string> = {
  POSITIVO: 'Aspectos valorados positivamente (Fortalezas / Satisfacción)',
  MEDIO: 'Novedades / Oportunidades de mejora moderadas',
  CRITICO: 'Puntos críticos / Riesgos altos que afectan el clima y la operación',
};

export const ESTADOS_AREA_FALLBACK = [
  { minPts: 90, maxPts: 100, estado: 'Excelente', color: '059669' },
  { minPts: 80, maxPts: 89, estado: 'Bueno', color: '0284C7' },
  { minPts: 70, maxPts: 79, estado: 'Aceptable / Estable', color: 'CA8A04' },
  { minPts: 50, maxPts: 69, estado: 'En Riesgo / Alerta', color: 'EA580C' },
  { minPts: 0, maxPts: 49, estado: 'Crítico / Vulnerable', color: 'E11D48' },
];

type EscalaCache = {
  termometro: Record<Termometro, number>;
  descripciones: Record<Termometro, string>;
  estados: { minPts: number; maxPts: number; estado: string; color: string | null }[];
  loadedAt: number;
};

let cache: EscalaCache | null = null;
const CACHE_MS = 15_000;

export function invalidateEscalaCache() {
  cache = null;
}

async function ensureEscalaDefaults() {
  const count = await prisma.escalaTermometro.count();
  if (count === 0) {
    for (const term of ['POSITIVO', 'MEDIO', 'CRITICO'] as Termometro[]) {
      await prisma.escalaTermometro.create({
        data: {
          termometro: term,
          puntos: TERMOMETRO_PTS_FALLBACK[term],
          descripcion: TERMOMETRO_DESC_FALLBACK[term],
        },
      });
    }
  }
  const estCount = await prisma.escalaEstadoArea.count();
  if (estCount === 0) {
    await prisma.escalaEstadoArea.createMany({
      data: ESTADOS_AREA_FALLBACK.map((e) => ({
        minPts: e.minPts,
        maxPts: e.maxPts,
        estado: e.estado,
        color: e.color,
      })),
    });
  }
}

async function loadEscala(): Promise<EscalaCache> {
  if (cache && Date.now() - cache.loadedAt < CACHE_MS) return cache;

  await ensureEscalaDefaults();

  const [terms, estados] = await Promise.all([
    prisma.escalaTermometro.findMany(),
    prisma.escalaEstadoArea.findMany({ orderBy: { minPts: 'desc' } }),
  ]);

  const termometro = { ...TERMOMETRO_PTS_FALLBACK };
  const descripciones = { ...TERMOMETRO_DESC_FALLBACK };
  for (const t of terms) {
    termometro[t.termometro] = t.puntos;
    if (t.descripcion) descripciones[t.termometro] = t.descripcion;
  }

  cache = {
    termometro,
    descripciones,
    estados: estados.length
      ? estados.map((e) => ({
          minPts: e.minPts,
          maxPts: e.maxPts,
          estado: e.estado,
          color: e.color,
        }))
      : ESTADOS_AREA_FALLBACK.map((e) => ({ ...e })),
    loadedAt: Date.now(),
  };
  return cache;
}

export async function getEscalaCompleta() {
  const e = await loadEscala();
  return {
    termometro: (['POSITIVO', 'MEDIO', 'CRITICO'] as Termometro[]).map((term) => ({
      termometro: term,
      puntos: e.termometro[term],
      descripcion: e.descripciones[term],
    })),
    estadosArea: [...e.estados].sort((a, b) => b.minPts - a.minPts),
    formulaArea: 'SUMA puntos de los hallazgos / Total de hallazgos del área',
  };
}

export async function puntosTermometro(t: Termometro): Promise<number> {
  const e = await loadEscala();
  return e.termometro[t] ?? TERMOMETRO_PTS_FALLBACK[t];
}

export async function estadoAreaDesdePromedio(promedio: number): Promise<string> {
  const e = await loadEscala();
  const match = e.estados.find((r) => promedio >= r.minPts && promedio <= r.maxPts);
  if (match) return match.estado;
  // fallback por si hay huecos en rangos
  if (promedio >= 90) return 'Excelente';
  if (promedio >= 80) return 'Bueno';
  if (promedio >= 70) return 'Aceptable / Estable';
  if (promedio >= 50) return 'En Riesgo / Alerta';
  return 'Crítico / Vulnerable';
}

export async function colorEstadoArea(promedio: number): Promise<string> {
  const e = await loadEscala();
  const match = e.estados.find((r) => promedio >= r.minPts && promedio <= r.maxPts);
  if (match?.color) return match.color.replace('#', '');
  const estado = await estadoAreaDesdePromedio(promedio);
  const byName = ESTADOS_AREA_FALLBACK.find((x) => x.estado === estado);
  return byName?.color || '57534E';
}

export function validateEstadosArea(
  rows: { minPts: number; maxPts: number; estado: string }[],
): string | null {
  if (!rows.length) return 'Debe haber al menos un rango';
  for (const r of rows) {
    if (!r.estado?.trim()) return 'Cada rango necesita nombre de estado';
    if (!Number.isFinite(r.minPts) || !Number.isFinite(r.maxPts)) return 'Min/max inválidos';
    if (r.minPts > r.maxPts) return `"${r.estado}": mínimo no puede ser mayor que máximo`;
    if (r.minPts < 0 || r.maxPts > 100) return 'Los puntos deben estar entre 0 y 100';
  }
  const sorted = [...rows].sort((a, b) => a.minPts - b.minPts);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].maxPts >= sorted[i + 1].minPts) {
      return `Rangos solapados: ${sorted[i].estado} y ${sorted[i + 1].estado}`;
    }
  }
  return null;
}

export function mesLabel(year: number, month: number): string {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${names[month - 1]} ${year}`;
}
