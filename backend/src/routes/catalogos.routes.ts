import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/areas', async (_req, res) => {
  const areas = await prisma.area.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  res.json(areas);
});

router.post('/areas', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name, sortOrder } = req.body as { name?: string; sortOrder?: number };
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const area = await prisma.area.create({
    data: { name: name.trim(), sortOrder: sortOrder ?? 99 },
  });
  res.status(201).json(area);
});

router.patch('/areas/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name, active, sortOrder } = req.body as {
    name?: string;
    active?: boolean;
    sortOrder?: number;
  };
  const area = await prisma.area.update({
    where: { id: paramId(req) },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });
  res.json(area);
});

router.get('/categorias', async (_req, res) => {
  const cats = await prisma.categoria.findMany({
    include: { subcategorias: { where: { active: true }, orderBy: { name: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  res.json(cats);
});

router.post('/categorias', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const cat = await prisma.categoria.create({ data: { name: name.trim() } });
  res.status(201).json(cat);
});

router.post('/subcategorias', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name, categoriaId } = req.body as { name?: string; categoriaId?: string };
  if (!name?.trim() || !categoriaId) {
    return res.status(400).json({ error: 'Nombre y categoría requeridos' });
  }
  const sub = await prisma.subcategoria.create({
    data: { name: name.trim(), categoriaId },
  });
  res.status(201).json(sub);
});

router.get('/responsables', async (_req, res) => {
  const list = await prisma.responsable.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  res.json(list);
});

router.post('/responsables', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const item = await prisma.responsable.create({ data: { name: name.trim() } });
  res.status(201).json(item);
});

router.get('/escala', async (_req, res) => {
  const [termometro, estados] = await Promise.all([
    prisma.escalaTermometro.findMany(),
    prisma.escalaEstadoArea.findMany({ orderBy: { minPts: 'desc' } }),
  ]);
  res.json({ termometro, estados });
});

export default router;
