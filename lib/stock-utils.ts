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

// Applies stock operations within a Prisma transaction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function applyStockOperations(tx: any, operations: StockOperation[]) {
  for (const op of operations) {
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
      await tx.stock.update({
        where: {
          productoId_ubicacion: {
            productoId: op.productoId,
            ubicacion: op.ubicacion,
          },
        },
        data: { cantidad: { decrement: Math.abs(op.delta) } },
      });
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
