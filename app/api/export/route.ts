import { NextRequest, NextResponse } from 'next/server';
import { TipoMovimiento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';
import { parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  try {
    requireSession(request);

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

    const fechaDesde = parseLocalDateStart(desde);
    const fechaHasta = parseLocalDateEnd(hasta);

    const whereClause: {
      createdAt: { gte: Date; lte: Date };
      vendedor?: string;
      tipo?: TipoMovimiento;
    } = {
      createdAt: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
    };

    if (vendedor) {
      whereClause.vendedor = vendedor;
    }

    if (tipo) {
      whereClause.tipo = tipo as TipoMovimiento;
    }

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

    const rows = movimientos.map((movimiento) => {
      const fecha = new Date(movimiento.createdAt);
      return [
        `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`,
        `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`,
        movimiento.tipo,
        `"${movimiento.producto.codigo.replace(/"/g, '""')}"`,
        `"${movimiento.producto.descripcion.replace(/"/g, '""')}"`,
        movimiento.cantidad.toString(),
        movimiento.ubicacionOrigen || '-',
        movimiento.ubicacionDestino || '-',
        `"${movimiento.vendedor.replace(/"/g, '""')}"`,
        movimiento.nota ? `"${movimiento.nota.replace(/"/g, '""')}"` : '',
      ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const csvWithBOM = '\uFEFF' + csv;
    const filename = `movimientos_${desde}_${hasta}.csv`;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error exporting movimientos:', error);
    return NextResponse.json(
      { error: 'Error al exportar movimientos' },
      { status: 500 }
    );
  }
}
