import { Prisma, ResultadoAccesoLogin } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureAccessLogSchema } from '@/lib/access-log';
import { AuthError, requireSession } from '@/lib/auth';

const VALID_RESULTS = new Set<ResultadoAccesoLogin>(['EXITOSO', 'FALLIDO']);

export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    await ensureAccessLogSchema();

    const searchParams = request.nextUrl.searchParams;
    const usuario = searchParams.get('usuario')?.trim() || '';
    const resultadoParam = searchParams.get('resultado')?.trim() || '';
    const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get('limit') || '25', 10) || 25, 1),
      100
    );

    const where: Prisma.AccesoLoginWhereInput = {};

    if (usuario) {
      where.usuario = {
        contains: usuario,
        mode: 'insensitive',
      };
    }

    if (VALID_RESULTS.has(resultadoParam as ResultadoAccesoLogin)) {
      where.resultado = resultadoParam as ResultadoAccesoLogin;
    }

    const [accesos, total] = await prisma.$transaction([
      prisma.accesoLogin.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.accesoLogin.count({ where }),
    ]);

    return NextResponse.json({
      accesos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching login accesses:', error);
    return NextResponse.json({ error: 'Error al obtener accesos' }, { status: 500 });
  }
}
