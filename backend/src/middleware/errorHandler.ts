import { Request, Response, NextFunction } from 'express';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Error interno';
  res.status(500).json({ error: message });
}
