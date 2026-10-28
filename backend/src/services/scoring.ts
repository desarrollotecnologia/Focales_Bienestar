import { Termometro } from '@prisma/client';

export const TERMOMETRO_PTS: Record<Termometro, number> = {
  CRITICO: 20,
  MEDIO: 60,
  POSITIVO: 100,
};

export function puntosTermometro(t: Termometro): number {
  return TERMOMETRO_PTS[t];
}

export function estadoAreaDesdePromedio(promedio: number): string {
  if (promedio >= 85) return 'Excelente';
  if (promedio >= 70) return 'Aceptable / Estable';
  if (promedio >= 50) return 'En Riesgo / Alerta';
  return 'Crítico / Vulnerable';
}

export function mesLabel(year: number, month: number): string {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${names[month - 1]} ${year}`;
}
