import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildEditChanges } from '@/lib/audit-utils';

// PUT - Editar producto del catálogo
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = parseInt(params.id);
    const body = await request.json();
    const { codigo, descripcion, fotoUrl, vendedor } = body;

    if (!vendedor) {
      return NextResponse.json({ error: 'Vendedor es requerido' }, { status: 400 });
    }

    // Fetch producto actual
    const old = await prisma.producto.findUnique({ where: { id } });
    if (!old) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Preparar nuevos valores
    const newData: { codigo?: string; descripcion?: string; fotoUrl?: string | null } = {};
    if (codigo !== undefined) newData.codigo = codigo;
    if (descripcion !== undefined) newData.descripcion = descripcion;
    if (fotoUrl !== undefined) newData.fotoUrl = fotoUrl;

    if (Object.keys(newData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    // Validar unicidad de código si cambió
    if (newData.codigo && newData.codigo !== old.codigo) {
      const existing = await prisma.producto.findUnique({ where: { codigo: newData.codigo } });
      if (existing) {
        return NextResponse.json({ error: `Ya existe un producto con el código ${newData.codigo}` }, { status: 400 });
      }
    }

    // Actualizar y registrar auditoría en transacción
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
            vendedor,
            cambios,
          },
        });
      }

      return result;
    });

    return NextResponse.json({ producto: updated });
  } catch (error: any) {
    console.error('Error updating producto:', error);

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El código de producto ya existe' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error al editar producto' }, { status: 500 });
  }
}
