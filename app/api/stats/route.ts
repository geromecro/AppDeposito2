import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fechaParam = searchParams.get('fecha'); // formato: YYYY-MM-DD

    // Calcular inicio y fin del día seleccionado
    const fechaInicio = fechaParam ? new Date(fechaParam) : new Date();
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setHours(23, 59, 59, 999);

    // Ejecutar queries en paralelo para mejor rendimiento
    const [
      totalProductos,
      stockTotales,
      movimientosDia,
      porVendedorDia,
      porTipoDia,
    ] = await Promise.all([
      // Total de productos en catálogo
      prisma.producto.count(),

      // Total de unidades por ubicación (agregado)
      prisma.stock.groupBy({
        by: ['ubicacion'],
        _sum: { cantidad: true },
      }),

      // Movimientos del día
      prisma.movimiento.count({
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin },
        },
      }),

      // Movimientos por vendedor del día
      prisma.movimiento.groupBy({
        by: ['vendedor'],
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin },
        },
        _count: { id: true },
        _sum: { cantidad: true },
      }),

      // Movimientos por tipo del día
      prisma.movimiento.groupBy({
        by: ['tipo'],
        where: {
          createdAt: { gte: fechaInicio, lte: fechaFin },
        },
        _count: { id: true },
        _sum: { cantidad: true },
      }),
    ]);

    // Calcular totales por ubicación
    const stockPorUbicacion: Record<string, number> = {};
    let totalUnidades = 0;
    for (const s of stockTotales) {
      const cantidad = s._sum?.cantidad || 0;
      stockPorUbicacion[s.ubicacion] = cantidad;
      totalUnidades += cantidad;
    }

    return NextResponse.json({
      totalProductos,
      totalUnidades,
      stockPorUbicacion,
      movimientosDia,
      porVendedor: porVendedorDia.map((v) => ({
        vendedor: v.vendedor,
        registros: v._count?.id || 0,
        unidades: v._sum?.cantidad || 0,
      })),
      porTipo: porTipoDia.map((t) => ({
        tipo: t.tipo,
        registros: t._count?.id || 0,
        unidades: t._sum?.cantidad || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    );
  }
}
