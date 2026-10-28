import { Request } from 'express';

export function paramId(req: Request, name = 'id'): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0];
  return value;
}
