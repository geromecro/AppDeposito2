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
