import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromRequest, setSessionCookie } from '@/lib/auth';
import { VENDEDORES } from '@/lib/constants';

const VALID_VENDEDORES = new Set<string>(VENDEDORES);

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ authenticated: false, vendedor: null });
  }

  return NextResponse.json({
    authenticated: true,
    vendedor: session.vendedor,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const vendedor = typeof body?.vendedor === 'string' ? body.vendedor.trim() : '';

    if (!VALID_VENDEDORES.has(vendedor)) {
      return NextResponse.json({ error: 'Vendedor invalido' }, { status: 400 });
    }

    const response = NextResponse.json({
      authenticated: true,
      vendedor,
    });

    setSessionCookie(response, vendedor as (typeof VENDEDORES)[number]);
    return response;
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Error al iniciar sesion' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
