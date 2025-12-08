import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    if (!desde || !hasta) {
      return NextResponse.json(
        { error: 'Parámetros desde y hasta son requeridos' },
        { status: 400 }
      );
    }

    // Calcular rango de fechas
    const fechaDesde = new Date(desde);
    fechaDesde.setHours(0, 0, 0, 0);
    const fechaHasta = new Date(hasta);
    fechaHasta.setHours(23, 59, 59, 999);

    // Obtener productos en el rango
    const productos = await prisma.producto.findMany({
      where: {
        createdAt: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generar CSV
    const headers = ['Codigo', 'Descripcion', 'Cantidad', 'Vendedor', 'Fecha'];
    const rows = productos.map((p) => [
      `"${p.codigo.replace(/"/g, '""')}"`,
      `"${p.descripcion.replace(/"/g, '""')}"`,
      p.cantidad.toString(),
      `"${p.vendedor.replace(/"/g, '""')}"`,
      new Date(p.createdAt).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // Nombre del archivo con rango de fechas
    const filename = `productos_${desde}_${hasta}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting productos:', error);
    return NextResponse.json(
      { error: 'Error al exportar productos' },
      { status: 500 }
    );
  }
}
