import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getReverseOperations, getStockOperations, applyStockOperations, mergeStockOperations, StockError } from '@/lib/stock-utils';
import { buildEditChanges, buildDeleteSnapshot } from '@/lib/audit-utils';
import { AuthError, requireSession } from '@/lib/auth';
import { UBICACIONES } from '@/lib/constants';

const VALID_UBICACIONES = new Set<string>(UBICACIONES);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// GET - Obtener movimiento por ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    requireSession(request);
    const params = await props.params;
    const id = parseInt(params.id, 10);

    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      include: {
        producto: {
          select: { id: true, codigo: true, descripcion: true, fotoUrl: true },
        },
      },
    });

    if (!movimiento) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ movimiento });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching movimiento:', error);
    return NextResponse.json({ error: 'Error al obtener movimiento' }, { status: 500 });
  }
}

// PUT - Editar movimiento (con recálculo de stock transaccional)
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = requireSession(request);
    const params = await props.params;
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const hasCantidad = Object.prototype.hasOwnProperty.call(body, 'cantidad');
    const hasUbicacionOrigen = Object.prototype.hasOwnProperty.call(body, 'ubicacionOrigen');
    const hasUbicacionDestino = Object.prototype.hasOwnProperty.call(body, 'ubicacionDestino');
    const hasNota = Object.prototype.hasOwnProperty.call(body, 'nota');

    const cantidad = body?.cantidad;
    const cantidadNumber = hasCantidad ? Number(cantidad) : undefined;
    const ubicacionOrigen = hasUbicacionOrigen
      ? (typeof body?.ubicacionOrigen === 'string' ? body.ubicacionOrigen : null)
      : undefined;
    const ubicacionDestino = hasUbicacionDestino
      ? (typeof body?.ubicacionDestino === 'string' ? body.ubicacionDestino : null)
      : undefined;
    const nota = hasNota ? (typeof body?.nota === 'string' ? body.nota.trim() : null) : undefined;

    const invalidCantidad =
      hasCantidad && (cantidadNumber === undefined || !Number.isInteger(cantidadNumber) || cantidadNumber < 1);

    if (invalidCantidad) {
      return badRequest('La cantidad debe ser un entero positivo');
    }

    if (ubicacionOrigen !== undefined && ubicacionOrigen !== null && !VALID_UBICACIONES.has(ubicacionOrigen)) {
      return badRequest('Ubicación origen inválida');
    }

    if (ubicacionDestino !== undefined && ubicacionDestino !== null && !VALID_UBICACIONES.has(ubicacionDestino)) {
      return badRequest('Ubicación destino inválida');
    }

    const result = await prisma.$transaction(async (tx) => {
      const old = await tx.movimiento.findUnique({
        where: { id },
        include: { producto: true },
      });

      if (!old) {
        throw new Error('Movimiento no encontrado');
      }

      const newData = {
        cantidad: cantidadNumber ?? old.cantidad,
        ubicacionOrigen: ubicacionOrigen !== undefined ? ubicacionOrigen : old.ubicacionOrigen,
        ubicacionDestino: ubicacionDestino !== undefined ? ubicacionDestino : old.ubicacionDestino,
        nota: nota !== undefined ? nota : old.nota,
      };

      if (old.tipo === 'ENTRADA' && !newData.ubicacionDestino) {
        throw new Error('Ubicación destino es requerida para ENTRADA');
      }
      if (old.tipo === 'TRASLADO' && (!newData.ubicacionOrigen || !newData.ubicacionDestino)) {
        throw new Error('Ubicación origen y destino son requeridas para TRASLADO');
      }
      if (old.tipo === 'SALIDA' && !newData.ubicacionOrigen) {
        throw new Error('Ubicación origen es requerida para SALIDA');
      }
      if (old.tipo === 'TRASLADO' && newData.ubicacionOrigen === newData.ubicacionDestino) {
        throw new Error('Origen y destino deben ser diferentes para un traslado');
      }

      const netOps = mergeStockOperations([
        ...getReverseOperations({
          tipo: old.tipo,
          cantidad: old.cantidad,
          ubicacionOrigen: old.ubicacionOrigen,
          ubicacionDestino: old.ubicacionDestino,
          productoId: old.productoId,
        }),
        ...getStockOperations({
          tipo: old.tipo,
          cantidad: newData.cantidad,
          ubicacionOrigen: newData.ubicacionOrigen,
          ubicacionDestino: newData.ubicacionDestino,
          productoId: old.productoId,
        }),
      ]);

      if (netOps.length > 0) {
        await applyStockOperations(tx, netOps);
      }

      const updated = await tx.movimiento.update({
        where: { id },
        data: {
          cantidad: newData.cantidad,
          ubicacionOrigen: newData.ubicacionOrigen,
          ubicacionDestino: newData.ubicacionDestino,
          nota: newData.nota,
        },
        include: { producto: true },
      });

      const cambios = buildEditChanges(
        {
          cantidad: old.cantidad,
          ubicacionOrigen: old.ubicacionOrigen,
          ubicacionDestino: old.ubicacionDestino,
          nota: old.nota,
        },
        {
          cantidad: newData.cantidad,
          ubicacionOrigen: newData.ubicacionOrigen,
          ubicacionDestino: newData.ubicacionDestino,
          nota: newData.nota,
        }
      );

      if (cambios) {
        await tx.historialCambio.create({
          data: {
            entidad: 'Movimiento',
            entidadId: id,
            accion: 'EDITAR',
            vendedor: session.vendedor,
            cambios,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ movimiento: result });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error updating movimiento:', error);

    if (
      error instanceof StockError ||
      error.message?.includes('no encontrado') ||
      error.message?.includes('requerida') ||
      error.message?.includes('Origen y destino')
    ) {
      return NextResponse.json(
        { error: error instanceof StockError ? `No se puede editar: ${error.message}` : error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Error al editar movimiento' }, { status: 500 });
  }
}

// DELETE - Eliminar movimiento (con reversión de stock transaccional)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = requireSession(request);
    const params = await props.params;
    const id = parseInt(params.id, 10);

    await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimiento.findUnique({
        where: { id },
        include: { producto: true },
      });

      if (!movimiento) {
        throw new Error('Movimiento no encontrado');
      }

      await applyStockOperations(
        tx,
        getReverseOperations({
          tipo: movimiento.tipo,
          cantidad: movimiento.cantidad,
          ubicacionOrigen: movimiento.ubicacionOrigen,
          ubicacionDestino: movimiento.ubicacionDestino,
          productoId: movimiento.productoId,
        })
      );

      await tx.historialCambio.create({
        data: {
          entidad: 'Movimiento',
          entidadId: id,
          accion: 'ELIMINAR',
          vendedor: session.vendedor,
          cambios: buildDeleteSnapshot(movimiento),
        },
      });

      await tx.movimiento.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error deleting movimiento:', error);

    if (error instanceof StockError || error.message?.includes('no encontrado')) {
      return NextResponse.json(
        { error: error instanceof StockError ? `No se puede eliminar: ${error.message}` : error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Error al eliminar movimiento' }, { status: 500 });
  }
}
