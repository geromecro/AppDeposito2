import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ubicacion = searchParams.get('ubicacion') || '';

    const productos = await prisma.producto.findMany({
      include: {
        stocks: true,
      },
      orderBy: { codigo: 'asc' },
    });

    const stockConsolidado = productos
      .map((p) => {
        const stockDeposito = p.stocks.find((s) => s.ubicacion === 'Deposito')?.cantidad || 0;
        const stockLocal = p.stocks.find((s) => s.ubicacion === 'Local')?.cantidad || 0;
        const total = stockDeposito + stockLocal;
        return { codigo: p.codigo, descripcion: p.descripcion, stockDeposito, stockLocal, total };
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

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting stock:', error);
    return NextResponse.json(
      { error: 'Error al exportar stock' },
      { status: 500 }
    );
  }
}
