import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getReverseOperations, getStockOperations, applyStockOperations, validateStockAfterOps } from '@/lib/stock-utils';
import { buildEditChanges, buildDeleteSnapshot } from '@/lib/audit-utils';

// GET - Obtener movimiento por ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = parseInt(params.id);

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
    console.error('Error fetching movimiento:', error);
    return NextResponse.json({ error: 'Error al obtener movimiento' }, { status: 500 });
  }
}

// PUT - Editar movimiento (con recálculo de stock transaccional)
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = parseInt(params.id);
    const body = await request.json();
    const { cantidad, ubicacionOrigen, ubicacionDestino, nota, vendedor } = body;

    if (!vendedor) {
      return NextResponse.json({ error: 'Vendedor es requerido' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch movimiento actual
      const old = await tx.movimiento.findUnique({
        where: { id },
        include: { producto: true },
      });

      if (!old) {
        throw new Error('Movimiento no encontrado');
      }

      // 2. Preparar nuevos valores (usar actuales si no se enviaron)
      const newData = {
        cantidad: cantidad ?? old.cantidad,
        ubicacionOrigen: ubicacionOrigen !== undefined ? ubicacionOrigen : old.ubicacionOrigen,
        ubicacionDestino: ubicacionDestino !== undefined ? ubicacionDestino : old.ubicacionDestino,
        nota: nota !== undefined ? nota : old.nota,
      };

      // Validar según tipo
      if (old.tipo === 'ENTRADA' && !newData.ubicacionDestino) {
        throw new Error('Ubicación destino es requerida para ENTRADA');
      }
      if (old.tipo === 'TRASLADO' && (!newData.ubicacionOrigen || !newData.ubicacionDestino)) {
        throw new Error('Ubicación origen y destino son requeridas para TRASLADO');
      }
      if (old.tipo === 'SALIDA' && !newData.ubicacionOrigen) {
        throw new Error('Ubicación origen es requerida para SALIDA');
      }

      // 3. Revertir stock del movimiento viejo
      const reverseOps = getReverseOperations({
        tipo: old.tipo,
        cantidad: old.cantidad,
        ubicacionOrigen: old.ubicacionOrigen,
        ubicacionDestino: old.ubicacionDestino,
        productoId: old.productoId,
      });

      // Validar que la reversión no deje stock negativo
      const reverseError = await validateStockAfterOps(tx, reverseOps);
      if (reverseError) {
        throw new Error(`No se puede editar: ${reverseError}`);
      }

      await applyStockOperations(tx, reverseOps);

      // 4. Aplicar stock del movimiento nuevo
      const applyOps = getStockOperations({
        tipo: old.tipo,
        cantidad: newData.cantidad,
        ubicacionOrigen: newData.ubicacionOrigen,
        ubicacionDestino: newData.ubicacionDestino,
        productoId: old.productoId,
      });

      const applyError = await validateStockAfterOps(tx, applyOps);
      if (applyError) {
        throw new Error(`No se puede editar: ${applyError}`);
      }

      await applyStockOperations(tx, applyOps);

      // 5. Actualizar movimiento
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

      // 6. Crear registro de auditoría
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
            vendedor,
            cambios,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ movimiento: result });
  } catch (error: any) {
    console.error('Error updating movimiento:', error);

    if (error.message?.includes('no encontrado') ||
        error.message?.includes('No se puede editar') ||
        error.message?.includes('requerida')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error al editar movimiento' }, { status: 500 });
  }
}

// DELETE - Eliminar movimiento (con reversión de stock transaccional)
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = parseInt(params.id);
    const body = await request.json();
    const { vendedor } = body;

    if (!vendedor) {
      return NextResponse.json({ error: 'Vendedor es requerido' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Fetch movimiento
      const movimiento = await tx.movimiento.findUnique({
        where: { id },
        include: { producto: true },
      });

      if (!movimiento) {
        throw new Error('Movimiento no encontrado');
      }

      // 2. Calcular reversión de stock
      const reverseOps = getReverseOperations({
        tipo: movimiento.tipo,
        cantidad: movimiento.cantidad,
        ubicacionOrigen: movimiento.ubicacionOrigen,
        ubicacionDestino: movimiento.ubicacionDestino,
        productoId: movimiento.productoId,
      });

      // 3. Validar que no quede stock negativo
      const error = await validateStockAfterOps(tx, reverseOps);
      if (error) {
        throw new Error(`No se puede eliminar: ${error}`);
      }

      // 4. Revertir stock
      await applyStockOperations(tx, reverseOps);

      // 5. Crear registro de auditoría
      await tx.historialCambio.create({
        data: {
          entidad: 'Movimiento',
          entidadId: id,
          accion: 'ELIMINAR',
          vendedor,
          cambios: buildDeleteSnapshot(movimiento),
        },
      });

      // 6. Eliminar movimiento
      await tx.movimiento.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting movimiento:', error);

    if (error.message?.includes('no encontrado') ||
        error.message?.includes('No se puede eliminar')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error al eliminar movimiento' }, { status: 500 });
  }
}
