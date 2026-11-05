/** Contraseña estándar de primer ingreso / reset admin. */
export const STANDARD_PASSWORD = 'Colbeef2026*';

export const MIN_PASSWORD_LENGTH = 8;

export function isStandardPassword(password: string): boolean {
  return password === STANDARD_PASSWORD;
}
