import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);

function wantAll(req: { query: Record<string, unknown> }) {
  return String(req.query.all || '') === '1';
}

router.get('/areas', async (req, res) => {
  const areas = await prisma.area.findMany({
    where: wantAll(req) ? undefined : { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
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

router.delete('/areas/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const id = paramId(req);
  const usados = await prisma.hallazgo.count({ where: { areaId: id } });
  const sesiones = await prisma.sesionGrupoFocal.count({ where: { areaId: id } });
  if (usados > 0 || sesiones > 0) {
    const area = await prisma.area.update({ where: { id }, data: { active: false } });
    return res.json({ ...area, softDeleted: true, motivo: 'Tiene hallazgos o reuniones; se desactivó' });
  }
  await prisma.area.delete({ where: { id } });
  res.json({ ok: true, deleted: true });
});

router.get('/categorias', async (req, res) => {
  const all = wantAll(req);
  const cats = await prisma.categoria.findMany({
    where: all ? undefined : { active: true },
    include: {
      subcategorias: {
        where: all ? undefined : { active: true },
        orderBy: { name: 'asc' },
      },
    },
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

router.patch('/categorias/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name, active } = req.body as { name?: string; active?: boolean };
  const cat = await prisma.categoria.update({
    where: { id: paramId(req) },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  res.json(cat);
});

router.delete('/categorias/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const id = paramId(req);
  const usados = await prisma.hallazgo.count({ where: { categoriaId: id } });
  if (usados > 0) {
    await prisma.subcategoria.updateMany({ where: { categoriaId: id }, data: { active: false } });
    const cat = await prisma.categoria.update({ where: { id }, data: { active: false } });
    return res.json({ ...cat, softDeleted: true, motivo: 'Tiene hallazgos; se desactivó' });
  }
  await prisma.subcategoria.deleteMany({ where: { categoriaId: id } });
  await prisma.categoria.delete({ where: { id } });
  res.json({ ok: true, deleted: true });
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

router.patch('/subcategorias/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name, active, categoriaId } = req.body as {
    name?: string;
    active?: boolean;
    categoriaId?: string;
  };
  const sub = await prisma.subcategoria.update({
    where: { id: paramId(req) },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(categoriaId !== undefined ? { categoriaId } : {}),
    },
  });
  res.json(sub);
});

router.delete('/subcategorias/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const id = paramId(req);
  const usados = await prisma.hallazgo.count({ where: { subcategoriaId: id } });
  if (usados > 0) {
    const sub = await prisma.subcategoria.update({ where: { id }, data: { active: false } });
    return res.json({ ...sub, softDeleted: true, motivo: 'Tiene hallazgos; se desactivó' });
  }
  await prisma.subcategoria.delete({ where: { id } });
  res.json({ ok: true, deleted: true });
});

router.get('/responsables', async (req, res) => {
  const list = await prisma.responsable.findMany({
    where: wantAll(req) ? undefined : { active: true },
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

router.patch('/responsables/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { name, active } = req.body as { name?: string; active?: boolean };
  const item = await prisma.responsable.update({
    where: { id: paramId(req) },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });
  res.json(item);
});

router.delete('/responsables/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const id = paramId(req);
  const usados = await prisma.hallazgoResponsable.count({ where: { responsableId: id } });
  if (usados > 0) {
    const item = await prisma.responsable.update({ where: { id }, data: { active: false } });
    return res.json({ ...item, softDeleted: true, motivo: 'Está asignado a hallazgos; se desactivó' });
  }
  await prisma.responsable.delete({ where: { id } });
  res.json({ ok: true, deleted: true });
});

router.get('/escala', async (_req, res) => {
  const { getEscalaCompleta } = await import('../services/scoring');
  res.json(await getEscalaCompleta());
});

router.put('/escala', requireRole('ADMIN'), async (req, res) => {
  const {
    getEscalaCompleta,
    invalidateEscalaCache,
    puntosTermometro,
    validateEstadosArea,
    TERMOMETRO_DESC_FALLBACK,
  } = await import('../services/scoring');
  const body = req.body as {
    termometro?: { termometro: string; puntos: number; descripcion?: string }[];
    estadosArea?: { minPts: number; maxPts: number; estado: string; color?: string | null }[];
    recalcularHallazgos?: boolean;
  };

  const termsOk = ['CRITICO', 'MEDIO', 'POSITIVO'] as const;

  if (body.termometro?.length) {
    for (const t of body.termometro) {
      if (!termsOk.includes(t.termometro as (typeof termsOk)[number])) {
        return res.status(400).json({ error: `Termómetro inválido: ${t.termometro}` });
      }
      const pts = Number(t.puntos);
      if (!Number.isFinite(pts) || pts < 0 || pts > 100) {
        return res.status(400).json({ error: `Puntos inválidos para ${t.termometro}` });
      }
    }
    for (const t of body.termometro) {
      const term = t.termometro as (typeof termsOk)[number];
      await prisma.escalaTermometro.upsert({
        where: { termometro: term },
        update: {
          puntos: Number(t.puntos),
          descripcion: t.descripcion?.trim() || TERMOMETRO_DESC_FALLBACK[term],
        },
        create: {
          termometro: term,
          puntos: Number(t.puntos),
          descripcion: t.descripcion?.trim() || TERMOMETRO_DESC_FALLBACK[term],
        },
      });
    }
  }

  if (body.estadosArea) {
    const err = validateEstadosArea(body.estadosArea);
    if (err) return res.status(400).json({ error: err });
    await prisma.escalaEstadoArea.deleteMany();
    await prisma.escalaEstadoArea.createMany({
      data: body.estadosArea.map((e) => ({
        minPts: Number(e.minPts),
        maxPts: Number(e.maxPts),
        estado: e.estado.trim(),
        color: e.color?.replace('#', '') || null,
      })),
    });
  }

  invalidateEscalaCache();

  let recalculados = 0;
  if (body.recalcularHallazgos !== false && body.termometro?.length) {
    for (const term of ['CRITICO', 'MEDIO', 'POSITIVO'] as const) {
      const pts = await puntosTermometro(term);
      const r = await prisma.hallazgo.updateMany({
        where: { termometro: term },
        data: { calificacion: pts },
      });
      recalculados += r.count;
    }
  }

  const escala = await getEscalaCompleta();
  res.json({ ...escala, recalculados });
});

export default router;
