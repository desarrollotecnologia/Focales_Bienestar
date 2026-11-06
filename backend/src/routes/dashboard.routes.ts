import { Router } from 'express';
import { EstadoSeguimiento, Termometro } from '@prisma/client';
import { authenticate, denyIfMustChangePassword } from '../middleware/auth';
import { getDashboardData, getTendenciaHistorica, DashboardFilters } from '../services/dashboard';
import { buildDashboardPptx } from '../services/pptxExport';
import { mesLabel } from '../services/scoring';

const router = Router();
router.use(authenticate);
router.use(denyIfMustChangePassword);

function parseIdList(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw : String(raw).split(',');
  return [...new Set(parts.map((s) => String(s).trim()).filter(Boolean))];
}

function parseNumList(raw: string | string[] | undefined): number[] {
  return parseIdList(raw)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function parseFilters(query: Record<string, string | string[] | undefined>): DashboardFilters {
  const cicloIds = parseIdList(query.cicloIds ?? query.cicloId);
  const areaIds = parseIdList(query.areaIds ?? query.areaId);
  const categoriaIds = parseIdList(query.categoriaIds ?? query.categoriaId);
  const termometros = parseIdList(query.termometros ?? query.termometro).filter((t) =>
    ['CRITICO', 'MEDIO', 'POSITIVO'].includes(t),
  ) as Termometro[];
  const estados = parseIdList(query.estados ?? query.estado).filter((e) =>
    ['ABIERTO', 'EN_PROCESO', 'CERRADO'].includes(e),
  ) as EstadoSeguimiento[];

  let anios = parseNumList(query.anios ?? query.anio);
  let meses = parseNumList(query.meses ?? query.mes);

  return {
    cicloIds: cicloIds.length ? cicloIds : undefined,
    areaIds: areaIds.length ? areaIds : undefined,
    categoriaIds: categoriaIds.length ? categoriaIds : undefined,
    termometros: termometros.length ? termometros : undefined,
    estados: estados.length ? estados : undefined,
    fechaDesde: typeof query.fechaDesde === 'string' ? query.fechaDesde : undefined,
    fechaHasta: typeof query.fechaHasta === 'string' ? query.fechaHasta : undefined,
    anios: anios.length ? anios : undefined,
    meses: meses.length ? meses : undefined,
  };
}

router.get('/', async (req, res) => {
  const filters = parseFilters(req.query as Record<string, string | string[]>);
  const data = await getDashboardData(filters);
  const { hallazgos: _h, ...rest } = data;
  res.json(rest);
});

router.get('/tendencia', async (req, res) => {
  const q = req.query as Record<string, string | string[] | undefined>;
  const areaIds = parseIdList(q.areaIds ?? q.areaId);
  const cicloIds = parseIdList(q.cicloIds ?? q.cicloId);
  const data = await getTendenciaHistorica({
    anioDesde: q.anioDesde ? Number(q.anioDesde) : undefined,
    anioHasta: q.anioHasta ? Number(q.anioHasta) : undefined,
    areaIds,
    cicloIds,
    granularidad: q.granularidad === 'semana' ? 'semana' : 'mes',
  });
  res.json(data);
});

router.get('/meses', async (req, res) => {
  const { cicloId } = req.query as { cicloId?: string };
  const { prisma } = await import('../lib/prisma');
  const hallazgos = await prisma.hallazgo.findMany({
    where: cicloId ? { cicloId } : undefined,
    select: { fecha: true },
  });
  const map = new Map<string, number>();
  for (const h of hallazgos) {
    const d = new Date(h.fecha);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const rows = [...map.entries()]
    .map(([key, total]) => {
      const [y, m] = key.split('-').map(Number);
      return { anio: y, mes: m, label: mesLabel(y, m), total };
    })
    .sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  res.json(rows);
});

router.get('/export/pptx', async (req, res) => {
  const filters = parseFilters(req.query as Record<string, string | string[]>);
  const data = await getDashboardData(filters);
  const buffer = await buildDashboardPptx(data);

  const nameParts = ['reporte-focales'];
  if (filters.anios?.length === 1 && filters.meses?.length === 1) {
    nameParts.push(`${filters.anios[0]}-${String(filters.meses[0]).padStart(2, '0')}`);
  } else if (filters.anios?.length) {
    nameParts.push(filters.anios.join('-'));
  }
  const filename = `${nameParts.join('-')}.pptx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export default router;
