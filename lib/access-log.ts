import { ResultadoAccesoLogin } from '@prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const IP_HEADER_NAMES = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'x-client-ip',
  'fastly-client-ip',
];

let ensureSchemaPromise: Promise<void> | null = null;

function normalizeText(value: string | null | undefined, maxLength: number) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  return normalized.slice(0, maxLength);
}

function getClientIp(request: NextRequest) {
  for (const headerName of IP_HEADER_NAMES) {
    const rawValue = request.headers.get(headerName);
    if (!rawValue) continue;

    const firstIp = rawValue.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  return null;
}

function getApproxLocation(request: NextRequest) {
  const city = normalizeText(request.headers.get('x-vercel-ip-city'), 80);
  const region = normalizeText(request.headers.get('x-vercel-ip-country-region'), 80);
  const country =
    normalizeText(request.headers.get('x-vercel-ip-country'), 80) ||
    normalizeText(request.headers.get('cf-ipcountry'), 80);

  const parts = [city, region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export async function ensureAccessLogSchema() {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          CREATE TYPE "ResultadoAccesoLogin" AS ENUM ('EXITOSO', 'FALLIDO');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AccesoLogin" (
          "id" SERIAL PRIMARY KEY,
          "usuario" TEXT NOT NULL,
          "ip" TEXT,
          "userAgent" TEXT,
          "resultado" "ResultadoAccesoLogin" NOT NULL,
          "ubicacionAprox" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AccesoLogin_createdAt_idx" ON "AccesoLogin"("createdAt");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AccesoLogin_usuario_idx" ON "AccesoLogin"("usuario");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AccesoLogin_resultado_idx" ON "AccesoLogin"("resultado");
      `);
    })().catch((error) => {
      ensureSchemaPromise = null;
      throw error;
    });
  }

  return ensureSchemaPromise;
}

export async function logLoginAccess(params: {
  request: NextRequest;
  usuario: string;
  resultado: ResultadoAccesoLogin;
}) {
  const { request, usuario, resultado } = params;

  try {
    await ensureAccessLogSchema();

    await prisma.accesoLogin.create({
      data: {
        usuario: normalizeText(usuario, 120) || 'Desconocido',
        ip: normalizeText(getClientIp(request), 80),
        userAgent: normalizeText(request.headers.get('user-agent'), 512),
        resultado,
        ubicacionAprox: getApproxLocation(request),
      },
    });
  } catch (error) {
    console.error('Error logging login access:', error);
  }
}
