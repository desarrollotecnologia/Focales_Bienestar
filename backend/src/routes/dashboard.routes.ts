import { Router } from 'express';
import { EstadoSeguimiento, Termometro } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { getDashboardData, DashboardFilters } from '../services/dashboard';
import { buildDashboardPptx } from '../services/pptxExport';
import { mesLabel } from '../services/scoring';

const router = Router();
router.use(authenticate);

function parseFilters(query: Record<string, string | undefined>): DashboardFilters {
  return {
    cicloId: query.cicloId || undefined,
    areaId: query.areaId || undefined,
    categoriaId: query.categoriaId || undefined,
    termometro: (query.termometro as Termometro) || undefined,
    estado: (query.estado as EstadoSeguimiento) || undefined,
    fechaDesde: query.fechaDesde || undefined,
    fechaHasta: query.fechaHasta || undefined,
    anio: query.anio ? Number(query.anio) : undefined,
    mes: query.mes ? Number(query.mes) : undefined,
  };
}

router.get('/', async (req, res) => {
  const filters = parseFilters(req.query as Record<string, string>);
  const data = await getDashboardData(filters);
  // No devolver hallazgos completos en dashboard (pesado); el front usa agregados
  const { hallazgos: _h, ...rest } = data;
  res.json(rest);
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
  const filters = parseFilters(req.query as Record<string, string>);
  const data = await getDashboardData(filters);
  const buffer = await buildDashboardPptx(data);

  const nameParts = ['reporte-focales'];
  if (filters.anio && filters.mes) nameParts.push(`${filters.anio}-${String(filters.mes).padStart(2, '0')}`);
  const filename = `${nameParts.join('-')}.pptx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export default router;
