import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const vendedor = searchParams.get('vendedor');
    const tipo = searchParams.get('tipo');

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

    // Construir filtros
    const whereClause: any = {
      createdAt: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
    };

    if (vendedor) {
      whereClause.vendedor = vendedor;
    }

    if (tipo) {
      whereClause.tipo = tipo;
    }

    // Obtener movimientos con producto incluido
    const movimientos = await prisma.movimiento.findMany({
      where: whereClause,
      include: {
        producto: {
          select: {
            codigo: true,
            descripcion: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generar CSV
    const headers = [
      'Fecha',
      'Hora',
      'Tipo',
      'Codigo',
      'Descripcion',
      'Cantidad',
      'Origen',
      'Destino',
      'Vendedor',
      'Nota',
    ];

    const rows = movimientos.map((m) => {
      const fecha = new Date(m.createdAt);
      return [
        `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`,
        `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`,
        m.tipo,
        `"${m.producto.codigo.replace(/"/g, '""')}"`,
        `"${m.producto.descripcion.replace(/"/g, '""')}"`,
        m.cantidad.toString(),
        m.ubicacionOrigen || '-',
        m.ubicacionDestino || '-',
        `"${m.vendedor.replace(/"/g, '""')}"`,
        m.nota ? `"${m.nota.replace(/"/g, '""')}"` : '',
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // Agregar BOM para que Excel reconozca UTF-8
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;

    // Nombre del archivo con rango de fechas
    const filename = `movimientos_${desde}_${hasta}.csv`;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting movimientos:', error);
    return NextResponse.json(
      { error: 'Error al exportar movimientos' },
      { status: 500 }
    );
  }
}
