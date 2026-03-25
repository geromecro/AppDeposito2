import { NextRequest, NextResponse } from 'next/server';
import { TipoMovimiento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';
import { applyStockOperations, getStockOperations, StockError } from '@/lib/stock-utils';
import { parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-utils';
import { TIPOS_MOVIMIENTO, UBICACIONES } from '@/lib/constants';

const VALID_TIPOS = new Set<string>(TIPOS_MOVIMIENTO);
const VALID_UBICACIONES = new Set<string>(UBICACIONES);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// GET - Listar movimientos con filtros
export async function GET(request: NextRequest) {
  try {
    requireSession(request);

    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo') as TipoMovimiento | null;
    const productoId = searchParams.get('productoId');
    const vendedor = searchParams.get('vendedor');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const whereClause: {
      tipo?: TipoMovimiento;
      productoId?: number;
      vendedor?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (tipo) {
      whereClause.tipo = tipo;
    }

    if (productoId) {
      whereClause.productoId = parseInt(productoId, 10);
    }

    if (vendedor) {
      whereClause.vendedor = vendedor;
    }

    if (fechaDesde || fechaHasta) {
      whereClause.createdAt = {};
      if (fechaDesde) {
        whereClause.createdAt.gte = parseLocalDateStart(fechaDesde);
      }
      if (fechaHasta) {
        whereClause.createdAt.lte = parseLocalDateEnd(fechaHasta);
      }
    }

    const movimientos = await prisma.movimiento.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            fotoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 50,
    });

    return NextResponse.json({ movimientos });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching movimientos:', error);
    return NextResponse.json(
      { error: 'Error al obtener movimientos' },
      { status: 500 }
    );
  }
}

// POST - Registrar nuevo movimiento (con actualización de stock transaccional)
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();

    const tipo = typeof body?.tipo === 'string' ? body.tipo : '';
    const productoId = body?.productoId;
    const codigo = typeof body?.codigo === 'string' ? body.codigo.trim() : '';
    const descripcion = typeof body?.descripcion === 'string' ? body.descripcion.trim() : '';
    const cantidad = Number(body?.cantidad);
    const ubicacionOrigen = typeof body?.ubicacionOrigen === 'string' ? body.ubicacionOrigen : null;
    const ubicacionDestino = typeof body?.ubicacionDestino === 'string' ? body.ubicacionDestino : null;
    const nota = typeof body?.nota === 'string' ? body.nota.trim() : null;
    const fotoUrl = typeof body?.fotoUrl === 'string' ? body.fotoUrl : null;

    if (!VALID_TIPOS.has(tipo)) {
      return badRequest('Tipo de movimiento inválido');
    }

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return badRequest('La cantidad debe ser un entero positivo');
    }

    if (!productoId && (!codigo || !descripcion)) {
      return badRequest('Debe proporcionar productoId o codigo+descripcion para crear nuevo producto');
    }

    if (ubicacionOrigen && !VALID_UBICACIONES.has(ubicacionOrigen)) {
      return badRequest('Ubicación origen inválida');
    }

    if (ubicacionDestino && !VALID_UBICACIONES.has(ubicacionDestino)) {
      return badRequest('Ubicación destino inválida');
    }

    if (tipo === 'ENTRADA' && !ubicacionDestino) {
      return badRequest('Ubicación destino es requerida para ENTRADA');
    }

    if (tipo === 'TRASLADO' && (!ubicacionOrigen || !ubicacionDestino)) {
      return badRequest('Ubicación origen y destino son requeridas para TRASLADO');
    }

    if (tipo === 'SALIDA' && !ubicacionOrigen) {
      return badRequest('Ubicación origen es requerida para SALIDA');
    }

    if (tipo === 'TRASLADO' && ubicacionOrigen === ubicacionDestino) {
      return badRequest('Origen y destino deben ser diferentes para un traslado');
    }

    const result = await prisma.$transaction(async (tx) => {
      let producto;

      if (productoId) {
        producto = await tx.producto.findUnique({ where: { id: Number(productoId) } });
        if (!producto) {
          throw new Error('Producto no encontrado');
        }
      } else {
        producto = await tx.producto.findUnique({ where: { codigo } });
        if (!producto) {
          producto = await tx.producto.create({
            data: {
              codigo,
              descripcion,
              fotoUrl: fotoUrl || null,
            },
          });
        }
      }

      const movimiento = await tx.movimiento.create({
        data: {
          tipo: tipo as TipoMovimiento,
          cantidad,
          ubicacionOrigen,
          ubicacionDestino,
          vendedor: session.vendedor,
          nota: nota || null,
          fotoUrl: fotoUrl || null,
          productoId: producto.id,
        },
        include: {
          producto: true,
        },
      });

      await applyStockOperations(
        tx,
        getStockOperations({
          tipo: tipo as TipoMovimiento,
          cantidad,
          ubicacionOrigen,
          ubicacionDestino,
          productoId: producto.id,
        })
      );

      return movimiento;
    });

    return NextResponse.json({ movimiento: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error creating movimiento:', error);

    if (error instanceof StockError || error.message?.includes('Producto no encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Error al registrar movimiento' },
      { status: 500 }
    );
  }
}
