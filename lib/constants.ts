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

export const CLASIFICACIONES_RELEVAMIENTO = [
  'CON_POTENCIAL',
  'SIN_SALIDA_HISTORICA',
  'PARA_REVISAR',
  'DESCARTAR',
] as const;

export type ClasificacionRelevamiento = typeof CLASIFICACIONES_RELEVAMIENTO[number];

export const CLASIFICACION_RELEVAMIENTO_LABELS: Record<ClasificacionRelevamiento, string> = {
  CON_POTENCIAL: 'Con potencial',
  SIN_SALIDA_HISTORICA: 'Sin salida historica',
  PARA_REVISAR: 'Para revisar',
  DESCARTAR: 'Descartar',
};

export const ESTADOS_RELEVAMIENTO = [
  'RELEVADO',
  'PENDIENTE_REVISION',
  'PENDIENTE_STOCK',
  'DUPLICADO_POTENCIAL',
  'DESCARTADO',
] as const;

export type EstadoRelevamiento = typeof ESTADOS_RELEVAMIENTO[number];

export const ESTADO_RELEVAMIENTO_LABELS: Record<EstadoRelevamiento, string> = {
  RELEVADO: 'Relevado',
  PENDIENTE_REVISION: 'Pendiente revision',
  PENDIENTE_STOCK: 'Pendiente stock',
  DUPLICADO_POTENCIAL: 'Duplicado potencial',
  DESCARTADO: 'Descartado',
};
