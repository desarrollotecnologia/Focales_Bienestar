import type { EstadoSeguimiento, Termometro } from '@/types';

export function TermometroBadge({ value }: { value: Termometro }) {
  const map = {
    CRITICO: ['Crítico', 'badge-critico'],
    MEDIO: ['Medio', 'badge-medio'],
    POSITIVO: ['Positivo', 'badge-positivo'],
  } as const;
  const [label, cls] = map[value];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export function EstadoBadge({ value }: { value: EstadoSeguimiento }) {
  const map = {
    ABIERTO: ['Abierto', 'badge-abierto'],
    EN_PROCESO: ['En proceso', 'badge-proceso'],
    CERRADO: ['Cerrado', 'badge-cerrado'],
  } as const;
  const [label, cls] = map[value];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
