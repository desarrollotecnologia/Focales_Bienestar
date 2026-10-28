import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);

async function cicloProgreso(cicloId: string) {
  const areasActivas = await prisma.area.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const sesiones = await prisma.sesionGrupoFocal.findMany({
    where: { cicloId },
    select: { areaId: true, fecha: true, id: true },
  });

  const cubiertas = new Set(sesiones.map((s) => s.areaId));
  const detalle = areasActivas.map((a) => ({
    areaId: a.id,
    area: a.name,
    cubierta: cubiertas.has(a.id),
    sesiones: sesiones.filter((s) => s.areaId === a.id).length,
  }));

  const pendientes = detalle.filter((d) => !d.cubierta);
  const puedeCerrar = pendientes.length === 0 && areasActivas.length > 0;

  return {
    totalAreas: areasActivas.length,
    areasCubiertas: detalle.filter((d) => d.cubierta).length,
    pendientes,
    detalle,
    puedeCerrar,
  };
}

router.get('/', async (_req, res) => {
  const ciclos = await prisma.ciclo.findMany({ orderBy: [{ anio: 'desc' }, { nombre: 'asc' }] });
  const withProgress = await Promise.all(
    ciclos.map(async (c) => ({
      ...c,
      progreso: await cicloProgreso(c.id),
    })),
  );
  res.json(withProgress);
});

router.get('/:id', async (req, res) => {
  const id = paramId(req);
  const ciclo = await prisma.ciclo.findUnique({ where: { id } });
  if (!ciclo) return res.status(404).json({ error: 'Ciclo no encontrado' });
  const progreso = await cicloProgreso(ciclo.id);
  const sesiones = await prisma.sesionGrupoFocal.findMany({
    where: { cicloId: ciclo.id },
    include: { area: true },
    orderBy: { fecha: 'asc' },
  });
  res.json({ ...ciclo, progreso, sesiones });
});

router.post('/', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { nombre, anio, fechaInicio, notas } = req.body as {
    nombre?: string;
    anio?: number;
    fechaInicio?: string;
    notas?: string;
  };
  if (!nombre?.trim() || !anio) {
    return res.status(400).json({ error: 'Nombre y año requeridos' });
  }
  const ciclo = await prisma.ciclo.create({
    data: {
      nombre: nombre.trim(),
      anio,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      notas: notas || null,
    },
  });
  res.status(201).json(ciclo);
});

router.post('/:id/cerrar', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const id = paramId(req);
  const progreso = await cicloProgreso(id);
  if (!progreso.puedeCerrar) {
    return res.status(400).json({
      error: 'No se puede cerrar: faltan áreas por reunir',
      pendientes: progreso.pendientes,
    });
  }
  const ciclo = await prisma.ciclo.update({
    where: { id },
    data: { estado: 'CERRADO', fechaCierre: new Date() },
  });
  res.json({ ...ciclo, progreso });
});

router.post('/:id/reabrir', requireRole('ADMIN'), async (req, res) => {
  const ciclo = await prisma.ciclo.update({
    where: { id: paramId(req) },
    data: { estado: 'ABIERTO', fechaCierre: null },
  });
  res.json(ciclo);
});

router.post('/:id/sesiones', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { areaId, fecha, hora, notasActa } = req.body as {
    areaId?: string;
    fecha?: string;
    hora?: string;
    notasActa?: string;
  };
  if (!areaId || !fecha) return res.status(400).json({ error: 'Área y fecha requeridas' });

  const ciclo = await prisma.ciclo.findUnique({ where: { id: paramId(req) } });
  if (!ciclo) return res.status(404).json({ error: 'Ciclo no encontrado' });
  if (ciclo.estado === 'CERRADO') {
    return res.status(400).json({ error: 'El ciclo está cerrado' });
  }

  const sesion = await prisma.sesionGrupoFocal.create({
    data: {
      cicloId: ciclo.id,
      areaId,
      fecha: new Date(fecha),
      hora: hora || null,
      notasActa: notasActa || null,
    },
    include: { area: true },
  });
  res.status(201).json(sesion);
});

export default router;
