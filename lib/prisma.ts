import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

// Cache for both dev and production to prevent connection pool exhaustion
globalForPrisma.prisma = prisma;
