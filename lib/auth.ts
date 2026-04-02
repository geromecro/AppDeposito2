import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { VENDEDORES, Vendedor } from '@/lib/constants';

const SESSION_COOKIE_NAME = 'appdeposito_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VALID_VENDEDORES = new Set<string>(VENDEDORES);

interface SessionPayload {
  vendedor: Vendedor;
  exp: number;
}

export class AuthError extends Error {
  constructor(message = 'No autenticado') {
    super(message);
    this.name = 'AuthError';
  }
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'development-session-secret-change-me';
  }

  throw new Error('SESSION_SECRET no configurado');
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function sign(payload: string) {
  return toBase64Url(
    crypto.createHmac('sha256', getSessionSecret()).update(payload).digest()
  );
}

function buildToken(session: SessionPayload) {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function parseToken(token: string | undefined | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as SessionPayload;

    if (!parsed?.vendedor || !VALID_VENDEDORES.has(parsed.vendedor) || parsed.exp <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function createSession(vendedor: Vendedor) {
  return buildToken({
    vendedor,
    exp: Date.now() + SESSION_TTL_MS,
  });
}

export function getSessionFromRequest(request: NextRequest) {
  return parseToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function requireSession(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    throw new AuthError();
  }

  return session;
}

export function setSessionCookie(response: NextResponse, vendedor: Vendedor) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSession(vendedor),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  });
}

export async function verifyAppPassword(password: string): Promise<boolean> {
  const stored = process.env.APP_PASSWORD_HASH;
  if (!stored) {
    if (process.env.NODE_ENV !== 'production') return true; // dev: sin contraseña configurada
    return false; // prod sin hash → fail-closed
  }

  const colonIndex = stored.indexOf(':');
  if (colonIndex === -1) return false;

  const salt = stored.slice(0, colonIndex);
  const expectedHash = stored.slice(colonIndex + 1);

  return new Promise((resolve) => {
    crypto.pbkdf2(password, salt, 100_000, 64, 'sha512', (err, derivedKey) => {
      if (err) { resolve(false); return; }
      const a = Buffer.from(derivedKey.toString('hex'));
      const b = Buffer.from(expectedHash);
      if (a.length !== b.length) { resolve(false); return; }
      resolve(crypto.timingSafeEqual(a, b));
    });
  });
}
