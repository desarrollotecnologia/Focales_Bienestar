import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import {
  STANDARD_PASSWORD,
  MIN_PASSWORD_LENGTH,
  isStandardPassword,
} from '../constants/password';

const router = Router();

function publicUser(user: {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email: string | null;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    email: user.email,
    mustChangePassword: user.mustChangePassword,
  };
}

function signToken(user: {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
}) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = signToken(user);

  res.json({
    token,
    user: publicUser(user),
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publicUser(user));
});

router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      error: 'Debe indicar contraseña actual, nueva y confirmación',
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'La nueva contraseña y la confirmación no coinciden' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    });
  }
  if (isStandardPassword(newPassword)) {
    return res.status(400).json({
      error: `No puede usar la contraseña estándar (${STANDARD_PASSWORD}). Elija una personal.`,
    });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user || !user.active) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
    },
  });

  const token = signToken(updated);
  res.json({
    token,
    user: publicUser(updated),
    message: 'Contraseña actualizada correctamente',
  });
});

export default router;
