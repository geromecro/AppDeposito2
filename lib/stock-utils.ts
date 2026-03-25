import { TipoMovimiento } from '@prisma/client';

interface MovimientoData {
  tipo: TipoMovimiento;
  cantidad: number;
  ubicacionOrigen: string | null;
  ubicacionDestino: string | null;
  productoId: number;
}

interface StockOperation {
  productoId: number;
  ubicacion: string;
  delta: number;
}

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockError';
  }
}

export function getStockOperations(mov: MovimientoData): StockOperation[] {
  const ops: StockOperation[] = [];

  if (mov.tipo === 'ENTRADA' && mov.ubicacionDestino) {
    ops.push({ productoId: mov.productoId, ubicacion: mov.ubicacionDestino, delta: mov.cantidad });
  } else if (mov.tipo === 'SALIDA' && mov.ubicacionOrigen) {
    ops.push({ productoId: mov.productoId, ubicacion: mov.ubicacionOrigen, delta: -mov.cantidad });
  } else if (mov.tipo === 'TRASLADO' && mov.ubicacionOrigen && mov.ubicacionDestino) {
    ops.push({ productoId: mov.productoId, ubicacion: mov.ubicacionOrigen, delta: -mov.cantidad });
    ops.push({ productoId: mov.productoId, ubicacion: mov.ubicacionDestino, delta: mov.cantidad });
  }

  return ops;
}

export function getReverseOperations(mov: MovimientoData): StockOperation[] {
  return getStockOperations(mov).map(op => ({ ...op, delta: -op.delta }));
}

export function mergeStockOperations(operations: StockOperation[]) {
  const merged = new Map<string, StockOperation>();

  for (const operation of operations) {
    const key = `${operation.productoId}:${operation.ubicacion}`;
    const current = merged.get(key);

    if (current) {
      current.delta += operation.delta;
    } else {
      merged.set(key, { ...operation });
    }
  }

  return [...merged.values()].filter((operation) => operation.delta !== 0);
}

// Applies stock operations within a Prisma transaction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function applyStockOperations(tx: any, operations: StockOperation[]) {
  for (const op of mergeStockOperations(operations)) {
    if (op.delta > 0) {
      await tx.stock.upsert({
        where: {
          productoId_ubicacion: {
            productoId: op.productoId,
            ubicacion: op.ubicacion,
          },
        },
        update: { cantidad: { increment: op.delta } },
        create: {
          productoId: op.productoId,
          ubicacion: op.ubicacion,
          cantidad: op.delta,
        },
      });
    } else if (op.delta < 0) {
      const amount = Math.abs(op.delta);
      const result = await tx.stock.updateMany({
        where: {
          productoId: op.productoId,
          ubicacion: op.ubicacion,
          cantidad: { gte: amount },
        },
        data: { cantidad: { decrement: amount } },
      });

      if (result.count === 0) {
        const stock = await tx.stock.findUnique({
          where: {
            productoId_ubicacion: {
              productoId: op.productoId,
              ubicacion: op.ubicacion,
            },
          },
        });

        const disponible = stock?.cantidad ?? 0;
        throw new StockError(
          `Stock insuficiente en ${op.ubicacion}. Disponible: ${disponible}, se necesitan: ${amount}`
        );
      }
    }
  }
}

// Validates that no stock goes negative after applying operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function validateStockAfterOps(tx: any, operations: StockOperation[]): Promise<string | null> {
  for (const op of operations) {
    if (op.delta < 0) {
      const stock = await tx.stock.findUnique({
        where: {
          productoId_ubicacion: {
            productoId: op.productoId,
            ubicacion: op.ubicacion,
          },
        },
      });
      const current = stock?.cantidad ?? 0;
      if (current + op.delta < 0) {
        return `Stock insuficiente en ${op.ubicacion}. Disponible: ${current}, se necesitan: ${Math.abs(op.delta)}`;
      }
    }
  }
  return null;
}
