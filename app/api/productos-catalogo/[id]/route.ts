import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildDeleteSnapshot, buildEditChanges } from '@/lib/audit-utils';
import { AuthError, requireSession } from '@/lib/auth';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    requireSession(request);
    const params = await props.params;
    const id = parseInt(params.id, 10);

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: { stocks: true },
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const stockDeposito = producto.stocks.find((stock) => stock.ubicacion === 'Deposito')?.cantidad || 0;
    const stockLocal = producto.stocks.find((stock) => stock.ubicacion === 'Local')?.cantidad || 0;

    return NextResponse.json({
      producto: {
        id: producto.id,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        fotoUrl: producto.fotoUrl,
        stockDeposito,
        stockLocal,
        total: stockDeposito + stockLocal,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching producto:', error);
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT - Editar producto del catálogo
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = requireSession(request);
    const params = await props.params;
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const { codigo, descripcion, fotoUrl } = body;

    const old = await prisma.producto.findUnique({ where: { id } });
    if (!old) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const newData: { codigo?: string; descripcion?: string; fotoUrl?: string | null } = {};
    if (codigo !== undefined) newData.codigo = codigo;
    if (descripcion !== undefined) newData.descripcion = descripcion;
    if (fotoUrl !== undefined) newData.fotoUrl = fotoUrl;

    if (Object.keys(newData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    if (newData.codigo && newData.codigo !== old.codigo) {
      const existing = await prisma.producto.findUnique({ where: { codigo: newData.codigo } });
      if (existing) {
        return NextResponse.json({ error: `Ya existe un producto con el código ${newData.codigo}` }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.producto.update({
        where: { id },
        data: newData,
      });

      const cambios = buildEditChanges(
        { codigo: old.codigo, descripcion: old.descripcion, fotoUrl: old.fotoUrl },
        { codigo: result.codigo, descripcion: result.descripcion, fotoUrl: result.fotoUrl }
      );

      if (cambios) {
        await tx.historialCambio.create({
          data: {
            entidad: 'Producto',
            entidadId: id,
            accion: 'EDITAR',
            vendedor: session.vendedor,
            cambios,
          },
        });
      }

      return result;
    });

    return NextResponse.json({ producto: updated });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error updating producto:', error);

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El código de producto ya existe' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error al editar producto' }, { status: 500 });
  }
}

// DELETE - Eliminar producto del catálogo si no tiene movimientos y no tiene stock
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = requireSession(request);
    const params = await props.params;
    const id = parseInt(params.id, 10);

    await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({
        where: { id },
        include: {
          stocks: true,
          movimientos: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      if (producto.movimientos.length > 0) {
        throw new Error('No se puede eliminar un producto con movimientos registrados');
      }

      const stockNoCero = producto.stocks.find((stock) => stock.cantidad !== 0);
      if (stockNoCero) {
        throw new Error('No se puede eliminar un producto con stock disponible');
      }

      await tx.historialCambio.create({
        data: {
          entidad: 'Producto',
          entidadId: id,
          accion: 'ELIMINAR',
          vendedor: session.vendedor,
          cambios: buildDeleteSnapshot(producto),
        },
      });

      await tx.stock.deleteMany({
        where: { productoId: id },
      });

      await tx.producto.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error deleting producto:', error);

    if (
      error.message?.includes('Producto no encontrado') ||
      error.message?.includes('No se puede eliminar')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}
