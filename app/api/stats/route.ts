import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';
import { formatDateForInput, parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  try {
    requireSession(request);

    const searchParams = request.nextUrl.searchParams;
    const fechaParam = searchParams.get('fecha');
    const fechaBase = fechaParam || formatDateForInput(new Date());
    const fechaInicio = parseLocalDateStart(fechaBase);
    const fechaFin = parseLocalDateEnd(fechaBase);
    const fechaActividadInicio = new Date(fechaInicio);
    fechaActividadInicio.setDate(fechaActividadInicio.getDate() - 29);

    const [
      totalProductos,
      stockTotales,
      movimientosDia,
      porVendedorDia,
      porTipoDia,
      productosActivos30d,
      ultimoMovimiento,
    ] = await Promise.all([
      prisma.producto.count(),
      prisma.stock.groupBy({
        by: ['ubicacion'],
        _sum: { cantidad: true },
      }),
      prisma.movimiento.count({
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin },
        },
      }),
      prisma.movimiento.groupBy({
        by: ['vendedor'],
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin },
        },
        _count: { id: true },
        _sum: { cantidad: true },
      }),
      prisma.movimiento.groupBy({
        by: ['tipo'],
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin },
        },
        _count: { id: true },
        _sum: { cantidad: true },
      }),
      prisma.movimiento.findMany({
        where: {
          createdAt: { gte: fechaActividadInicio, lte: fechaFin },
        },
        distinct: ['productoId'],
        select: { productoId: true },
      }),
      prisma.movimiento.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          tipo: true,
          vendedor: true,
          producto: {
            select: {
              codigo: true,
            },
          },
        },
      }),
    ]);

    const stockPorUbicacion: Record<string, number> = {};
    let totalUnidades = 0;

    for (const stock of stockTotales) {
      const cantidad = stock._sum?.cantidad || 0;
      stockPorUbicacion[stock.ubicacion] = cantidad;
      totalUnidades += cantidad;
    }

    return NextResponse.json({
      totalProductos,
      totalUnidades,
      stockPorUbicacion,
      movimientosDia,
      salidasDia:
        porTipoDia.find((item) => item.tipo === 'SALIDA')?._count?.id || 0,
      productosActivos30d: productosActivos30d.length,
      ultimoMovimiento: ultimoMovimiento
        ? {
            createdAt: ultimoMovimiento.createdAt,
            tipo: ultimoMovimiento.tipo,
            vendedor: ultimoMovimiento.vendedor,
            productoCodigo: ultimoMovimiento.producto.codigo,
          }
        : null,
      porVendedor: porVendedorDia.map((item) => ({
        vendedor: item.vendedor,
        registros: item._count?.id || 0,
        unidades: item._sum?.cantidad || 0,
      })),
      porTipo: porTipoDia.map((item) => ({
        tipo: item.tipo,
        registros: item._count?.id || 0,
        unidades: item._sum?.cantidad || 0,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    );
  }
}
