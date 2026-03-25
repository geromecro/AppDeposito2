import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    requireSession(request);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);

    const whereClause: {
      OR?: Array<{
        codigo?: { contains: string; mode: 'insensitive' };
        descripcion?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (search) {
      whereClause.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: { stocks: true },
      orderBy: [{ codigo: 'asc' }],
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20,
    });

    return NextResponse.json({
      productos: productos.map((producto) => {
        const stockDeposito = producto.stocks.find((stock) => stock.ubicacion === 'Deposito')?.cantidad || 0;
        const stockLocal = producto.stocks.find((stock) => stock.ubicacion === 'Local')?.cantidad || 0;

        return {
          id: producto.id,
          codigo: producto.codigo,
          descripcion: producto.descripcion,
          fotoUrl: producto.fotoUrl,
          stockDeposito,
          stockLocal,
          total: stockDeposito + stockLocal,
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching catalogo:', error);
    return NextResponse.json({ error: 'Error al obtener catalogo' }, { status: 500 });
  }
}
