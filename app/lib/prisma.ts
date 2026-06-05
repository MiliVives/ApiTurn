import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('sslmode', 'verify-full');
  const adapter = new PrismaPg({
    connectionString: url.toString(),
    max: 3,                              // small pool — appropriate for serverless/dev
    keepAlive: true,                     // prevent TCP connection drops after idle
    keepAliveInitialDelayMillis: 10_000, // start keepalive after 10s of inactivity
    connectionTimeoutMillis: 15_000,     // fail fast (15s) instead of hanging 60s
    idleTimeoutMillis: 30_000,           // release idle connections after 30s
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
// Always cache globally — ensures connection reuse across requests in both dev and prod
globalForPrisma.prisma = prisma;
