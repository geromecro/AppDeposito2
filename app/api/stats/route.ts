import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Total de productos
    const totalProductos = await prisma.producto.count();

    // Suma total de cantidades
    const sumaCantidades = await prisma.producto.aggregate({
      _sum: { cantidad: true },
    });

    // Productos por vendedor
    const porVendedor = await prisma.producto.groupBy({
      by: ['vendedor'],
      _count: { id: true },
      _sum: { cantidad: true },
    });

    // Productos de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const productosHoy = await prisma.producto.count({
      where: {
        createdAt: { gte: hoy },
      },
    });

    return NextResponse.json({
      totalProductos,
      totalUnidades: sumaCantidades._sum.cantidad || 0,
      productosHoy,
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
