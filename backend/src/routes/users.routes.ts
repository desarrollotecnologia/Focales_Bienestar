import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

const publicUser = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

function parseRole(role?: string): UserRole | null {
  if (role === 'ADMIN' || role === 'EDITOR' || role === 'VIEWER') return role;
  return null;
}

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: publicUser,
    orderBy: [{ active: 'desc' }, { fullName: 'asc' }],
  });
  res.json(users);
});

router.post('/', async (req, res) => {
  const { username, password, fullName, email, role } = req.body as {
    username?: string;
    password?: string;
    fullName?: string;
    email?: string | null;
    role?: string;
  };

  if (!username?.trim() || !password || !fullName?.trim()) {
    return res.status(400).json({ error: 'Usuario, contraseña y nombre son requeridos' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  const parsedRole = parseRole(role) || 'EDITOR';

  const exists = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username.trim() },
        ...(email?.trim() ? [{ email: email.trim() }] : []),
      ],
    },
  });
  if (exists) {
    return res.status(400).json({ error: 'Ya existe un usuario con ese login o correo' });
  }

  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      fullName: fullName.trim(),
      email: email?.trim() || null,
      role: parsedRole,
      active: true,
    },
    select: publicUser,
  });
  res.status(201).json(user);
});

router.patch('/:id', async (req, res) => {
  const id = paramId(req);
  const { fullName, email, role, active, password } = req.body as {
    fullName?: string;
    email?: string | null;
    role?: string;
    active?: boolean;
    password?: string;
  };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  // No desactivar ni degradar al único ADMIN activo
  if (target.role === 'ADMIN' && target.active) {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', active: true },
    });
    const wouldDemote = role && role !== 'ADMIN';
    const wouldDeactivate = active === false;
    if (adminCount <= 1 && (wouldDemote || wouldDeactivate)) {
      return res.status(400).json({
        error: 'Debe quedar al menos un administrador activo',
      });
    }
  }

  if (id === req.user!.userId && active === false) {
    return res.status(400).json({ error: 'No puede desactivarse a sí mismo' });
  }

  const parsedRole = role !== undefined ? parseRole(role) : null;
  if (role !== undefined && !parsedRole) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  if (password !== undefined && password.length > 0 && password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
      ...(email !== undefined ? { email: email?.trim() || null } : {}),
      ...(parsedRole ? { role: parsedRole } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: publicUser,
  });
  res.json(user);
});

router.delete('/:id', async (req, res) => {
  const id = paramId(req);

  if (id === req.user!.userId) {
    return res.status(400).json({ error: 'No puede eliminarse a sí mismo' });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (target.role === 'ADMIN' && target.active) {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', active: true },
    });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'No se puede eliminar el único administrador activo' });
    }
  }

  await prisma.user.delete({ where: { id } });
  res.json({ ok: true, deleted: true, id });
});

export default router;
