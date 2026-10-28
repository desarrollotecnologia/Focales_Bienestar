import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { authenticate } from '../middleware/auth';

const router = Router();

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

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email,
    },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    email: user.email,
  });
});

export default router;
