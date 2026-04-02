import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'appdeposito_session';

const PROTECTED_PATHS = [
  '/inventario',
  '/transferencias',
  '/resumen',
  '/deposito',
  '/relevamiento',
  '/historial',
  '/movimientos',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
