import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromRequest, setSessionCookie, verifyAppPassword } from '@/lib/auth';
import { logLoginAccess } from '@/lib/access-log';
import { VENDEDORES } from '@/lib/constants';

const VALID_VENDEDORES = new Set<string>(VENDEDORES);

interface FailedAttempt {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
// En-memory por instancia de Node.js. En Vercel multi-instancia no hay coordinacion global,
// pero sigue siendo un disuasivo efectivo contra fuerza bruta simple.
const failedAttempts = new Map<string, FailedAttempt>();

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
    const password = typeof body?.password === 'string' ? body.password : '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const now = Date.now();
    const attempt = failedAttempts.get(ip);
    if (attempt && attempt.count >= RATE_LIMIT_MAX_ATTEMPTS && attempt.resetAt > now) {
      await logLoginAccess({
        request,
        usuario: vendedor || 'Desconocido',
        resultado: 'FALLIDO',
      });

      const retryAfter = Math.ceil((attempt.resetAt - now) / 1000);
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta mas tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const vendorValid = VALID_VENDEDORES.has(vendedor);
    const passwordValid = await verifyAppPassword(password);

    if (!vendorValid || !passwordValid) {
      const current = failedAttempts.get(ip);
      if (current && current.resetAt > now) {
        current.count += 1;
      } else {
        failedAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }

      await logLoginAccess({
        request,
        usuario: vendedor || 'Desconocido',
        resultado: 'FALLIDO',
      });

      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    failedAttempts.delete(ip);

    await logLoginAccess({
      request,
      usuario: vendedor,
      resultado: 'EXITOSO',
    });

    const response = NextResponse.json({ authenticated: true, vendedor });
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
