export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type Termometro = 'CRITICO' | 'MEDIO' | 'POSITIVO';
export type EstadoSeguimiento = 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
export type CicloEstado = 'ABIERTO' | 'CERRADO';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string | null;
  mustChangePassword?: boolean;
}

export interface Area {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Categoria {
  id: string;
  name: string;
  active: boolean;
  subcategorias: Subcategoria[];
}

export interface Subcategoria {
  id: string;
  name: string;
  categoriaId: string;
  active: boolean;
}

export interface Responsable {
  id: string;
  name: string;
  active: boolean;
}

export interface CicloProgreso {
  totalAreas: number;
  areasCubiertas: number;
  puedeCerrar: boolean;
  pendientes: { areaId: string; area: string; cubierta: boolean }[];
  detalle: { areaId: string; area: string; cubierta: boolean; sesiones: number }[];
}

export interface Ciclo {
  id: string;
  nombre: string;
  anio: number;
  estado: CicloEstado;
  fechaInicio?: string | null;
  fechaCierre?: string | null;
  notas?: string | null;
  progreso?: CicloProgreso;
}

export interface SesionGrupoFocal {
  id: string;
  cicloId: string;
  areaId: string;
  fecha: string;
  hora?: string | null;
  notasActa?: string | null;
  area: Area;
  ciclo: Ciclo;
  _count?: { hallazgos: number };
  hallazgos?: Hallazgo[];
}

export interface Hallazgo {
  id: string;
  fecha: string;
  termometro: Termometro;
  observacion: string;
  compromiso?: string | null;
  estadoSeguimiento: EstadoSeguimiento;
  avances?: string | null;
  calificacion: number;
  cicloId: string;
  sesionId?: string | null;
  areaId: string;
  categoriaId: string;
  subcategoriaId?: string | null;
  area: Area;
  categoria: Categoria;
  subcategoria?: Subcategoria | null;
  ciclo: Ciclo;
  responsables: { responsable: Responsable }[];
}

export interface DashboardData {
  total: number;
  categorias: { name: string; count: number }[];
  subcategorias: { name: string; count: number }[];
  termometro: Record<Termometro, number>;
  estados: Record<EstadoSeguimiento, number>;
  termometroAreas: {
    areaId: string;
    area: string;
    calificacion: number;
    estado: string;
    hallazgos: number;
  }[];
  promedioGeneral: number;
  estadoPromedio: string;
  comparativoPrevio: {
    label: string;
    abierto: number;
    enProceso: number;
    cerrado: number;
    total: number;
  } | null;
  criticos: {
    id: string;
    fecha: string;
    area: string;
    categoria: string;
    subcategoria: string | null;
    observacion: string;
    estado: EstadoSeguimiento;
  }[];
  positivos: {
    id: string;
    fecha: string;
    area: string;
    categoria: string;
    subcategoria: string | null;
    observacion: string;
    estado: EstadoSeguimiento;
  }[];
  mediosAgrupados: { tema: string; count: number; items: string[] }[];
  filtrosAplicados: Record<string, unknown>;
}

export type TendenciaDir = 'mejoro' | 'empeoro' | 'estable' | 'sin_datos';

export interface TendenciaData {
  filtros: {
    anioDesde: number;
    anioHasta: number;
    areaIds: string[];
    cicloIds: string[];
    granularidad: 'mes' | 'semana';
  };
  periodos: {
    key: string;
    label: string;
    promedio: number;
    hallazgos: number;
    areas: { areaId: string; area: string; promedio: number; hallazgos: number }[];
  }[];
  series: {
    id: string;
    nombre: string;
    puntos: { key: string; label: string; valor: number | null; hallazgos: number }[];
  }[];
  evolucion: {
    desde: string;
    hasta: string;
    promedioInicial: number;
    promedioActual: number;
    delta: number;
    tendencia: TendenciaDir;
  } | null;
  areasEvolucion: {
    areaId: string;
    area: string;
    promedioInicial: number | null;
    promedioActual: number | null;
    delta: number | null;
    tendencia: TendenciaDir;
  }[];
  totalHallazgos: number;
}
