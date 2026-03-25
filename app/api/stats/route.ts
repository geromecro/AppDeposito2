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

    const [
      totalProductos,
      stockTotales,
      movimientosDia,
      porVendedorDia,
      porTipoDia,
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
