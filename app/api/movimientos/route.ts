import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TipoMovimiento } from '@prisma/client';

// GET - Listar movimientos con filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo') as TipoMovimiento | null;
    const productoId = searchParams.get('productoId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = {};

    if (tipo) {
      whereClause.tipo = tipo;
    }

    if (productoId) {
      whereClause.productoId = parseInt(productoId);
    }

    if (fechaDesde || fechaHasta) {
      whereClause.createdAt = {};
      if (fechaDesde) {
        whereClause.createdAt.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = hasta;
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
      take: limit,
    });

    return NextResponse.json({ movimientos });
  } catch (error) {
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
    const body = await request.json();
    const {
      tipo,
      productoId,
      codigo,
      descripcion,
      cantidad,
      ubicacionOrigen,
      ubicacionDestino,
      vendedor,
      nota,
      fotoUrl,
    } = body;

    // Validaciones básicas
    if (!tipo || !cantidad || !vendedor) {
      return NextResponse.json(
        { error: 'Tipo, cantidad y vendedor son requeridos' },
        { status: 400 }
      );
    }

    if (!productoId && (!codigo || !descripcion)) {
      return NextResponse.json(
        { error: 'Debe proporcionar productoId o codigo+descripcion para crear nuevo producto' },
        { status: 400 }
      );
    }

    // Validar según tipo de movimiento
    if (tipo === 'ENTRADA' && !ubicacionDestino) {
      return NextResponse.json(
        { error: 'Ubicación destino es requerida para ENTRADA' },
        { status: 400 }
      );
    }

    if (tipo === 'TRASLADO' && (!ubicacionOrigen || !ubicacionDestino)) {
      return NextResponse.json(
        { error: 'Ubicación origen y destino son requeridas para TRASLADO' },
        { status: 400 }
      );
    }

    if (tipo === 'SALIDA' && !ubicacionOrigen) {
      return NextResponse.json(
        { error: 'Ubicación origen es requerida para SALIDA' },
        { status: 400 }
      );
    }

    // Ejecutar transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener o crear producto
      let producto;
      if (productoId) {
        producto = await tx.producto.findUnique({ where: { id: productoId } });
        if (!producto) {
          throw new Error('Producto no encontrado');
        }
      } else {
        // Buscar por código o crear
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

      // 2. Validar stock disponible para TRASLADO o SALIDA
      if (tipo === 'TRASLADO' || tipo === 'SALIDA') {
        const stockOrigen = await tx.stock.findUnique({
          where: {
            productoId_ubicacion: {
              productoId: producto.id,
              ubicacion: ubicacionOrigen,
            },
          },
        });

        if (!stockOrigen || stockOrigen.cantidad < cantidad) {
          const disponible = stockOrigen?.cantidad || 0;
          throw new Error(
            `Stock insuficiente en ${ubicacionOrigen}. Disponible: ${disponible}, Solicitado: ${cantidad}`
          );
        }
      }

      // 3. Crear movimiento
      const movimiento = await tx.movimiento.create({
        data: {
          tipo: tipo as TipoMovimiento,
          cantidad,
          ubicacionOrigen: ubicacionOrigen || null,
          ubicacionDestino: ubicacionDestino || null,
          vendedor,
          nota: nota || null,
          fotoUrl: fotoUrl || null,
          productoId: producto.id,
        },
        include: {
          producto: true,
        },
      });

      // 4. Actualizar stock según tipo
      if (tipo === 'ENTRADA') {
        await tx.stock.upsert({
          where: {
            productoId_ubicacion: {
              productoId: producto.id,
              ubicacion: ubicacionDestino,
            },
          },
          update: { cantidad: { increment: cantidad } },
          create: {
            productoId: producto.id,
            ubicacion: ubicacionDestino,
            cantidad,
          },
        });
      } else if (tipo === 'TRASLADO') {
        // Restar de origen
        await tx.stock.update({
          where: {
            productoId_ubicacion: {
              productoId: producto.id,
              ubicacion: ubicacionOrigen,
            },
          },
          data: { cantidad: { decrement: cantidad } },
        });
        // Sumar a destino
        await tx.stock.upsert({
          where: {
            productoId_ubicacion: {
              productoId: producto.id,
              ubicacion: ubicacionDestino,
            },
          },
          update: { cantidad: { increment: cantidad } },
          create: {
            productoId: producto.id,
            ubicacion: ubicacionDestino,
            cantidad,
          },
        });
      } else if (tipo === 'SALIDA') {
        await tx.stock.update({
          where: {
            productoId_ubicacion: {
              productoId: producto.id,
              ubicacion: ubicacionOrigen,
            },
          },
          data: { cantidad: { decrement: cantidad } },
        });
      }

      return movimiento;
    });

    return NextResponse.json({ movimiento: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating movimiento:', error);

    // Errores de validación de negocio
    if (error.message?.includes('Stock insuficiente') ||
        error.message?.includes('Producto no encontrado')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al registrar movimiento' },
      { status: 500 }
    );
  }
}
