import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../lib/prisma';

export interface AuthPayload {
  userId: string;
  username: string;
  role: UserRole;
  mustChangePassword?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/** Bloquea el resto de la API si el usuario debe cambiar la contraseña. */
export async function denyIfMustChangePassword(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { mustChangePassword: true, active: true },
    });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }
    if (user.mustChangePassword) {
      return res.status(403).json({
        error: 'Debe cambiar la contraseña antes de continuar',
        code: 'MUST_CHANGE_PASSWORD',
      });
    }
    next();
  } catch {
    return res.status(500).json({ error: 'Error de autenticación' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tiene permisos para esta acción' });
    }
    next();
  };
}
