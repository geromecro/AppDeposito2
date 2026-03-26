import { NextRequest, NextResponse } from 'next/server';
import { ClasificacionRelevamiento, EstadoRelevamiento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';
import {
  CLASIFICACIONES_RELEVAMIENTO,
  ESTADOS_RELEVAMIENTO,
} from '@/lib/constants';

const VALID_CLASIFICACIONES = new Set<string>(CLASIFICACIONES_RELEVAMIENTO);
const VALID_ESTADOS = new Set<string>(ESTADOS_RELEVAMIENTO);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function buildCodigoProvisorio() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `RV-${datePart}-${timePart}-${randomPart}`;
}

export async function GET(request: NextRequest) {
  try {
    requireSession(request);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || '';
    const estado = searchParams.get('estado');
    const limit = Number.parseInt(searchParams.get('limit') || '12', 10);

    const whereClause: {
      estado?: EstadoRelevamiento;
      OR?: Array<{
        codigo?: { contains: string; mode: 'insensitive' };
        codigoProvisorio?: { contains: string; mode: 'insensitive' };
        descripcion?: { contains: string; mode: 'insensitive' };
        ubicacionFisica?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (estado && VALID_ESTADOS.has(estado)) {
      whereClause.estado = estado as EstadoRelevamiento;
    }

    if (search) {
      whereClause.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { codigoProvisorio: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { ubicacionFisica: { contains: search, mode: 'insensitive' } },
      ];
    }

    const relevamientos = await prisma.productoRelevado.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { relevadoAt: 'desc' },
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 12,
    });

    return NextResponse.json({ relevamientos });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching relevamientos:', error);
    return NextResponse.json(
      { error: 'Error al obtener relevamientos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();

    const codigo = typeof body?.codigo === 'string' ? body.codigo.trim() : '';
    const descripcion = typeof body?.descripcion === 'string' ? body.descripcion.trim() : '';
    const fotoUrl = typeof body?.fotoUrl === 'string' ? body.fotoUrl : null;
    const ubicacionFisica = typeof body?.ubicacionFisica === 'string' ? body.ubicacionFisica.trim() : '';
    const observacion = typeof body?.observacion === 'string' ? body.observacion.trim() : '';
    const clasificacion = typeof body?.clasificacion === 'string' ? body.clasificacion : '';

    if (!descripcion && !fotoUrl) {
      return badRequest('Debes completar una descripcion o cargar una foto');
    }

    if (!ubicacionFisica) {
      return badRequest('La ubicacion fisica es requerida');
    }

    if (!VALID_CLASIFICACIONES.has(clasificacion)) {
      return badRequest('Clasificacion invalida');
    }

    const productoExistente = codigo
      ? await prisma.producto.findUnique({ where: { codigo } })
      : null;

    const estado = productoExistente
      ? EstadoRelevamiento.DUPLICADO_POTENCIAL
      : clasificacion === 'DESCARTAR'
        ? EstadoRelevamiento.DESCARTADO
        : EstadoRelevamiento.PENDIENTE_REVISION;

    const relevamiento = await prisma.productoRelevado.create({
      data: {
        codigo: codigo || null,
        codigoProvisorio: buildCodigoProvisorio(),
        descripcion: descripcion || 'Sin descripcion',
        fotoUrl,
        ubicacionFisica,
        observacion: observacion || null,
        clasificacion: clasificacion as ClasificacionRelevamiento,
        estado,
        relevadoPor: session.vendedor,
      },
    });

    return NextResponse.json(
      {
        relevamiento,
        duplicateCatalogProduct: productoExistente
          ? {
              id: productoExistente.id,
              codigo: productoExistente.codigo,
              descripcion: productoExistente.descripcion,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error creating relevamiento:', error);
    return NextResponse.json(
      { error: 'Error al guardar el relevamiento' },
      { status: 500 }
    );
  }
}
