import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';
import { buildDeleteSnapshot, buildEditChanges } from '@/lib/audit-utils';
import {
  CLASIFICACIONES_RELEVAMIENTO,
  ESTADOS_RELEVAMIENTO,
} from '@/lib/constants';

const VALID_CLASIFICACIONES = new Set<string>(CLASIFICACIONES_RELEVAMIENTO);
const VALID_ESTADOS = new Set<string>(ESTADOS_RELEVAMIENTO);

function parseId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    requireSession(request);
    const params = await props.params;
    const id = parseId(params.id);

    if (!id) {
      return badRequest('Id invalido');
    }

    const relevamiento = await prisma.productoRelevado.findUnique({
      where: { id },
    });

    if (!relevamiento) {
      return NextResponse.json(
        { error: 'Relevamiento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ relevamiento });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching relevamiento:', error);
    return NextResponse.json(
      { error: 'Error al obtener relevamiento' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request);
    const params = await props.params;
    const id = parseId(params.id);

    if (!id) {
      return badRequest('Id invalido');
    }

    const body = await request.json();
    const current = await prisma.productoRelevado.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: 'Relevamiento no encontrado' },
        { status: 404 }
      );
    }

    const nextCodigo =
      typeof body?.codigo === 'string'
        ? body.codigo.trim() || null
        : current.codigo;
    const nextDescripcion =
      typeof body?.descripcion === 'string'
        ? body.descripcion.trim()
        : current.descripcion;
    const nextFotoUrl =
      body?.fotoUrl === null
        ? null
        : typeof body?.fotoUrl === 'string'
          ? body.fotoUrl
          : current.fotoUrl;
    const nextUbicacionFisica =
      typeof body?.ubicacionFisica === 'string'
        ? body.ubicacionFisica.trim()
        : current.ubicacionFisica;
    const nextObservacion =
      body?.observacion === null
        ? null
        : typeof body?.observacion === 'string'
          ? body.observacion.trim() || null
          : current.observacion;
    const nextClasificacion =
      typeof body?.clasificacion === 'string'
        ? body.clasificacion
        : current.clasificacion;
    const nextEstado =
      typeof body?.estado === 'string' ? body.estado : current.estado;

    if (!nextDescripcion && !nextFotoUrl) {
      return badRequest('Debes completar una descripcion o cargar una foto');
    }

    if (!nextUbicacionFisica) {
      return badRequest('La ubicacion fisica es requerida');
    }

    if (!VALID_CLASIFICACIONES.has(nextClasificacion)) {
      return badRequest('Clasificacion invalida');
    }

    if (!VALID_ESTADOS.has(nextEstado)) {
      return badRequest('Estado invalido');
    }

    const duplicateCatalogProduct = nextCodigo
      ? await prisma.producto.findUnique({ where: { codigo: nextCodigo } })
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.productoRelevado.update({
        where: { id },
        data: {
          codigo: nextCodigo,
          descripcion: nextDescripcion,
          fotoUrl: nextFotoUrl,
          ubicacionFisica: nextUbicacionFisica,
          observacion: nextObservacion,
          clasificacion: nextClasificacion,
          estado: nextEstado,
        },
      });

      const cambios = buildEditChanges(
        {
          codigo: current.codigo,
          descripcion: current.descripcion,
          fotoUrl: current.fotoUrl,
          ubicacionFisica: current.ubicacionFisica,
          observacion: current.observacion,
          clasificacion: current.clasificacion,
          estado: current.estado,
        },
        {
          codigo: result.codigo,
          descripcion: result.descripcion,
          fotoUrl: result.fotoUrl,
          ubicacionFisica: result.ubicacionFisica,
          observacion: result.observacion,
          clasificacion: result.clasificacion,
          estado: result.estado,
        }
      );

      if (cambios) {
        await tx.historialCambio.create({
          data: {
            entidad: 'ProductoRelevado',
            entidadId: id,
            accion: 'EDITAR',
            vendedor: session.vendedor,
            cambios,
          },
        });
      }

      return result;
    });

    return NextResponse.json({
      relevamiento: updated,
      duplicateCatalogProduct: duplicateCatalogProduct
        ? {
            id: duplicateCatalogProduct.id,
            codigo: duplicateCatalogProduct.codigo,
            descripcion: duplicateCatalogProduct.descripcion,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error updating relevamiento:', error);
    return NextResponse.json(
      { error: 'Error al editar relevamiento' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request);
    const params = await props.params;
    const id = parseId(params.id);

    if (!id) {
      return badRequest('Id invalido');
    }

    await prisma.$transaction(async (tx) => {
      const relevamiento = await tx.productoRelevado.findUnique({
        where: { id },
      });

      if (!relevamiento) {
        throw new Error('Relevamiento no encontrado');
      }

      await tx.historialCambio.create({
        data: {
          entidad: 'ProductoRelevado',
          entidadId: id,
          accion: 'ELIMINAR',
          vendedor: session.vendedor,
          cambios: buildDeleteSnapshot(relevamiento),
        },
      });

      await tx.productoRelevado.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error deleting relevamiento:', error);

    if (error.message?.includes('Relevamiento no encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Error al eliminar relevamiento' },
      { status: 500 }
    );
  }
}
