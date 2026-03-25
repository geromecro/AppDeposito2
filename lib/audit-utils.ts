// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildEditChanges(oldValues: Record<string, any>, newValues: Record<string, any>): Record<string, { antes: any; despues: any }> | null {
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {};

  for (const key of Object.keys(newValues)) {
    const oldVal = oldValues[key] ?? null;
    const newVal = newValues[key] ?? null;
    if (oldVal !== newVal) {
      cambios[key] = { antes: oldVal, despues: newVal };
    }
  }

  return Object.keys(cambios).length > 0 ? cambios : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildDeleteSnapshot(entity: Record<string, any>): Record<string, any> {
  const { producto, ...rest } = entity;
  return {
    ...rest,
    ...(producto ? { producto: { codigo: producto.codigo, descripcion: producto.descripcion } } : {}),
  };
}
