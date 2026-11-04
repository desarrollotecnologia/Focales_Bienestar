import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);

const includeSesion = {
  area: true,
  ciclo: true,
  _count: { select: { hallazgos: true } },
};

router.get('/', async (req, res) => {
  const { cicloId, areaId } = req.query as Record<string, string>;
  const where: { cicloId?: string; areaId?: string } = {};
  if (cicloId) where.cicloId = cicloId;
  if (areaId) where.areaId = areaId;

  const sesiones = await prisma.sesionGrupoFocal.findMany({
    where,
    include: includeSesion,
    orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(sesiones);
});

router.get('/:id', async (req, res) => {
  const sesion = await prisma.sesionGrupoFocal.findUnique({
    where: { id: paramId(req) },
    include: {
      ...includeSesion,
      hallazgos: {
        include: {
          area: true,
          categoria: true,
          subcategoria: true,
          ciclo: true,
          responsables: { include: { responsable: true } },
        },
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  });
  if (!sesion) return res.status(404).json({ error: 'Reunión no encontrada' });
  res.json(sesion);
});

router.patch('/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { hora, notasActa } = req.body as { hora?: string | null; notasActa?: string | null };
  const data: { hora?: string | null; notasActa?: string | null } = {};
  if (hora !== undefined) data.hora = hora;
  if (notasActa !== undefined) data.notasActa = notasActa;

  const sesion = await prisma.sesionGrupoFocal.update({
    where: { id: paramId(req) },
    data,
    include: includeSesion,
  });
  res.json(sesion);
});

export default router;
