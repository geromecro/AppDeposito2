import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Listar todos los productos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    const productos = await prisma.producto.findMany({
      where: search
        ? {
            OR: [
              { codigo: { contains: search, mode: 'insensitive' } },
              { descripcion: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
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

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, descripcion, cantidad, fotoUrl, vendedor } = body;

    if (!codigo || !descripcion || !vendedor) {
      return NextResponse.json(
        { error: 'Codigo, descripcion y vendedor son requeridos' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.create({
      data: {
        codigo,
        descripcion,
        cantidad: cantidad || 1,
        fotoUrl: fotoUrl || null,
        vendedor,
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
