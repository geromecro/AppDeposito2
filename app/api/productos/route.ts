import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Listar todos los productos (modelo legacy para compatibilidad)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const ubicacion = searchParams.get('ubicacion') || '';

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (ubicacion) {
      whereClause.ubicacion = ubicacion;
    }

    const productos = await prisma.productoLegacy.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ productos });
  } catch (error) {
    console.error('Error fetching productos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo producto (modelo legacy para compatibilidad)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, descripcion, cantidad, fotoUrl, vendedor, ubicacion } = body;

    if (!codigo || !descripcion || !vendedor || !ubicacion) {
      return NextResponse.json(
        { error: 'Codigo, descripcion, vendedor y ubicacion son requeridos' },
        { status: 400 }
      );
    }

    const producto = await prisma.productoLegacy.create({
      data: {
        codigo,
        descripcion,
        cantidad: cantidad || 1,
        fotoUrl: fotoUrl || null,
        vendedor,
        ubicacion,
      },
    });

    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    console.error('Error creating producto:', error);
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}
