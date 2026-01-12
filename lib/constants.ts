export const VENDEDORES = [
  'Geronimo',
  'Mateo',
  'Rodrigo',
  'Alexander',
  'Alejandro',
  'Emanuel',
  'Nicolas'
] as const;

export type Vendedor = typeof VENDEDORES[number];

export const UBICACIONES = ['Local', 'Deposito'] as const;

export type Ubicacion = typeof UBICACIONES[number];

export const TIPOS_MOVIMIENTO = ['ENTRADA', 'TRASLADO', 'SALIDA'] as const;

export type TipoMovimiento = typeof TIPOS_MOVIMIENTO[number];

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimiento, string> = {
  ENTRADA: 'Entrada',
  TRASLADO: 'Traslado',
  SALIDA: 'Salida'
};

export const TIPO_MOVIMIENTO_COLORS: Record<TipoMovimiento, string> = {
  ENTRADA: 'bg-accent-100 text-accent-700',
  TRASLADO: 'bg-blue-100 text-blue-700',
  SALIDA: 'bg-warning-100 text-warning-700'
};
