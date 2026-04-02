import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    requireSession(request);

    const searchParams = request.nextUrl.searchParams;
    const ubicacion = searchParams.get('ubicacion') || '';

    const productos = await prisma.producto.findMany({
      include: {
        stocks: true,
      },
      orderBy: { codigo: 'asc' },
    });

    const stockConsolidado = productos
      .map((producto) => {
        const stockDeposito = producto.stocks.find((stock) => stock.ubicacion === 'Deposito')?.cantidad || 0;
        const stockLocal = producto.stocks.find((stock) => stock.ubicacion === 'Local')?.cantidad || 0;
        const total = stockDeposito + stockLocal;
        return { codigo: producto.codigo, descripcion: producto.descripcion, stockDeposito, stockLocal, total };
      })
      .filter((item) => {
        if (ubicacion === 'Deposito') return item.stockDeposito > 0;
        if (ubicacion === 'Local') return item.stockLocal > 0;
        return item.total > 0;
      });

    const headers = ['Codigo', 'Descripcion', 'Stock Deposito', 'Stock Local', 'Total'];
    const rows = stockConsolidado.map((item) => [
      `"${item.codigo.replace(/"/g, '""')}"`,
      `"${item.descripcion.replace(/"/g, '""')}"`,
      item.stockDeposito.toString(),
      item.stockLocal.toString(),
      item.total.toString(),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error exporting stock:', error);
    return NextResponse.json(
      { error: 'Error al exportar stock' },
      { status: 500 }
    );
  }
}
