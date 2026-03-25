import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthError, requireSession } from '@/lib/auth';

// GET - Consultar historial de cambios
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const searchParams = request.nextUrl.searchParams;
    const entidad = searchParams.get('entidad');
    const entidadId = searchParams.get('entidadId');
    const vendedor = searchParams.get('vendedor');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = {};

    if (entidad) whereClause.entidad = entidad;
    if (entidadId) whereClause.entidadId = parseInt(entidadId);
    if (vendedor) whereClause.vendedor = vendedor;

    const historial = await prisma.historialCambio.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ historial });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching historial:', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}
