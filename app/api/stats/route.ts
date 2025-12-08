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

    // Total de productos (sin filtro de fecha)
    const totalProductos = await prisma.producto.count();

    // Suma total de cantidades (sin filtro de fecha)
    const sumaCantidades = await prisma.producto.aggregate({
      _sum: { cantidad: true },
    });

    // Productos del día seleccionado
    const productosDia = await prisma.producto.count({
      where: {
        createdAt: { gte: fechaInicio, lte: fechaFin },
      },
    });

    // Productos por vendedor del día seleccionado
    const porVendedor = await prisma.producto.groupBy({
      by: ['vendedor'],
      where: {
        createdAt: { gte: fechaInicio, lte: fechaFin },
      },
      _count: { id: true },
      _sum: { cantidad: true },
    });

    return NextResponse.json({
      totalProductos,
      totalUnidades: sumaCantidades._sum.cantidad || 0,
      productosDia,
      porVendedor: porVendedor.map((v) => ({
        vendedor: v.vendedor,
        registros: v._count.id,
        unidades: v._sum.cantidad || 0,
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
