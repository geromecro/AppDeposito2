import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener stock consolidado
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const ubicacion = searchParams.get('ubicacion') || '';
    const sinStock = searchParams.get('sinStock') === 'true';

    // Obtener todos los productos con sus stocks
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        stocks: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Procesar y formatear respuesta
    const stockConsolidado = productos.map((p) => {
      const stockDeposito = p.stocks.find((s) => s.ubicacion === 'Deposito')?.cantidad || 0;
      const stockLocal = p.stocks.find((s) => s.ubicacion === 'Local')?.cantidad || 0;
      const total = stockDeposito + stockLocal;

      return {
        producto: {
          id: p.id,
          codigo: p.codigo,
          descripcion: p.descripcion,
          fotoUrl: p.fotoUrl,
        },
        stockDeposito,
        stockLocal,
        total,
      };
    }).filter((item) => {
      // Filtrar por ubicación si se especifica
      if (ubicacion === 'Deposito') return item.stockDeposito > 0;
      if (ubicacion === 'Local') return item.stockLocal > 0;
      if (sinStock) return item.total === 0;
      return true;
    });

    // Calcular totales generales
    const totales = {
      productos: stockConsolidado.length,
      unidadesDeposito: stockConsolidado.reduce((sum, s) => sum + s.stockDeposito, 0),
      unidadesLocal: stockConsolidado.reduce((sum, s) => sum + s.stockLocal, 0),
      unidadesTotal: stockConsolidado.reduce((sum, s) => sum + s.total, 0),
    };

    return NextResponse.json({
      stock: stockConsolidado,
      totales,
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { error: 'Error al obtener stock' },
      { status: 500 }
    );
  }
}
