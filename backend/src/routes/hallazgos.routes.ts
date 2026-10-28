import { Router } from 'express';
import { EstadoSeguimiento, Prisma, Termometro } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { puntosTermometro } from '../services/scoring';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);

const includeHallazgo = {
  area: true,
  categoria: true,
  subcategoria: true,
  ciclo: true,
  sesion: true,
  responsables: { include: { responsable: true } },
  historial: { orderBy: { createdAt: 'desc' as const }, take: 20 },
};

router.get('/', async (req, res) => {
  const {
    cicloId,
    areaId,
    categoriaId,
    termometro,
    estado,
    q,
    fechaDesde,
    fechaHasta,
    anio,
    mes,
    page = '1',
    pageSize = '50',
  } = req.query as Record<string, string>;

  const where: Prisma.HallazgoWhereInput = {};
  if (cicloId) where.cicloId = cicloId;
  if (areaId) where.areaId = areaId;
  if (categoriaId) where.categoriaId = categoriaId;
  if (termometro) where.termometro = termometro as Termometro;
  if (estado) where.estadoSeguimiento = estado as EstadoSeguimiento;
  if (q) {
    where.OR = [
      { observacion: { contains: q } },
      { compromiso: { contains: q } },
      { avances: { contains: q } },
    ];
  }

  if (anio && mes) {
    const y = Number(anio);
    const m = Number(mes);
    where.fecha = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lte: new Date(Date.UTC(y, m, 0)),
    };
  } else if (fechaDesde || fechaHasta) {
    where.fecha = {};
    if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
    if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
  }

  const take = Math.min(Number(pageSize) || 50, 200);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, items] = await Promise.all([
    prisma.hallazgo.count({ where }),
    prisma.hallazgo.findMany({
      where,
      include: includeHallazgo,
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
      take,
      skip,
    }),
  ]);

  res.json({ total, page: Number(page) || 1, pageSize: take, items });
});

router.get('/:id', async (req, res) => {
  const item = await prisma.hallazgo.findUnique({
    where: { id: paramId(req) },
    include: {
      ...includeHallazgo,
      historial: { orderBy: { createdAt: 'desc' }, include: { createdBy: true } },
    },
  });
  if (!item) return res.status(404).json({ error: 'Hallazgo no encontrado' });
  res.json(item);
});

router.post('/', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const body = req.body as {
    cicloId?: string;
    sesionId?: string;
    areaId?: string;
    categoriaId?: string;
    subcategoriaId?: string;
    fecha?: string;
    termometro?: Termometro;
    observacion?: string;
    compromiso?: string;
    estadoSeguimiento?: EstadoSeguimiento;
    avances?: string;
    responsableIds?: string[];
  };

  if (!body.cicloId || !body.areaId || !body.categoriaId || !body.fecha || !body.termometro || !body.observacion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const item = await prisma.hallazgo.create({
    data: {
      cicloId: body.cicloId,
      sesionId: body.sesionId || null,
      areaId: body.areaId,
      categoriaId: body.categoriaId,
      subcategoriaId: body.subcategoriaId || null,
      fecha: new Date(body.fecha),
      termometro: body.termometro,
      observacion: body.observacion,
      compromiso: body.compromiso || null,
      estadoSeguimiento: body.estadoSeguimiento || 'ABIERTO',
      avances: body.avances || null,
      calificacion: puntosTermometro(body.termometro),
      responsables: body.responsableIds?.length
        ? { create: body.responsableIds.map((id) => ({ responsableId: id })) }
        : undefined,
    },
    include: includeHallazgo,
  });

  res.status(201).json(item);
});

router.put('/:id', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const body = req.body as {
    cicloId?: string;
    sesionId?: string | null;
    areaId?: string;
    categoriaId?: string;
    subcategoriaId?: string | null;
    fecha?: string;
    termometro?: Termometro;
    observacion?: string;
    compromiso?: string | null;
    estadoSeguimiento?: EstadoSeguimiento;
    avances?: string | null;
    responsableIds?: string[];
  };

  const data: Prisma.HallazgoUpdateInput = {};
  if (body.cicloId) data.ciclo = { connect: { id: body.cicloId } };
  if (body.areaId) data.area = { connect: { id: body.areaId } };
  if (body.categoriaId) data.categoria = { connect: { id: body.categoriaId } };
  if (body.subcategoriaId === null) data.subcategoria = { disconnect: true };
  else if (body.subcategoriaId) data.subcategoria = { connect: { id: body.subcategoriaId } };
  if (body.sesionId === null) data.sesion = { disconnect: true };
  else if (body.sesionId) data.sesion = { connect: { id: body.sesionId } };
  if (body.fecha) data.fecha = new Date(body.fecha);
  if (body.termometro) {
    data.termometro = body.termometro;
    data.calificacion = puntosTermometro(body.termometro);
  }
  if (body.observacion !== undefined) data.observacion = body.observacion;
  if (body.compromiso !== undefined) data.compromiso = body.compromiso;
  if (body.estadoSeguimiento) data.estadoSeguimiento = body.estadoSeguimiento;
  if (body.avances !== undefined) data.avances = body.avances;

  const hallazgoId = paramId(req);
  await prisma.$transaction(async (tx) => {
    if (body.responsableIds) {
      await tx.hallazgoResponsable.deleteMany({ where: { hallazgoId } });
      if (body.responsableIds.length) {
        await tx.hallazgoResponsable.createMany({
          data: body.responsableIds.map((id) => ({
            hallazgoId,
            responsableId: id,
          })),
        });
      }
    }
    await tx.hallazgo.update({ where: { id: hallazgoId }, data });
  });

  const item = await prisma.hallazgo.findUnique({
    where: { id: hallazgoId },
    include: includeHallazgo,
  });
  res.json(item);
});

router.post('/:id/avances', requireRole('ADMIN', 'EDITOR'), async (req, res) => {
  const { texto, estadoSeguimiento } = req.body as {
    texto?: string;
    estadoSeguimiento?: EstadoSeguimiento;
  };
  if (!texto?.trim()) return res.status(400).json({ error: 'Texto de avance requerido' });

  const hallazgo = await prisma.hallazgo.findUnique({ where: { id: paramId(req) } });
  if (!hallazgo) return res.status(404).json({ error: 'Hallazgo no encontrado' });

  const stamp = new Date().toLocaleDateString('es-CO');
  const nuevoAvances = hallazgo.avances
    ? `${hallazgo.avances}\nÚLTIMA ACTUALIZACIÓN (${stamp}): ${texto.trim()}`
    : `ÚLTIMA ACTUALIZACIÓN (${stamp}): ${texto.trim()}`;

  const [avance, updated] = await prisma.$transaction([
    prisma.avanceHistorial.create({
      data: {
        hallazgoId: hallazgo.id,
        texto: texto.trim(),
        createdById: req.user!.userId,
      },
    }),
    prisma.hallazgo.update({
      where: { id: hallazgo.id },
      data: {
        avances: nuevoAvances,
        ...(estadoSeguimiento ? { estadoSeguimiento } : {}),
      },
      include: includeHallazgo,
    }),
  ]);

  res.status(201).json({ avance, hallazgo: updated });
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.hallazgo.delete({ where: { id: paramId(req) } });
  res.json({ ok: true });
});

export default router;
