/**
 * Creates two PENDING appointments at the same time slot so you can verify
 * the overlap/conflict detection in the admin pending list.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/seed-overlap.ts
 */

// Load env first so DATABASE_URL is available before prisma.ts runs
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createClient() {
  const url = new URL(process.env.DATABASE_URL ?? process.env.POSTGRES_URL!);
  url.searchParams.set('sslmode', 'verify-full');
  const adapter = new PrismaPg({ connectionString: url.toString() });
  return new PrismaClient({ adapter });
}

const prisma = createClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { renapaNumber: { not: null } },
    take: 2,
  });

  if (users.length < 2) {
    console.error('Need at least 2 users with a RENAPA number. Add them first.');
    process.exit(1);
  }

  const service = await prisma.service.findFirstOrThrow({ where: { isActive: true } });

  // 3 days from now at 09:00 local time
  const slot = new Date();
  slot.setDate(slot.getDate() + 3);
  slot.setHours(9, 0, 0, 0);

  await prisma.appointment.createMany({
    data: [
      {
        userId:       users[0].id,
        serviceId:    service.id,
        scheduledAt:  slot,
        quantity:     5,
        honeyVariety: 'Colza',
        apiarySource: 'Apiario Test A',
        status:       'PENDING',
      },
      {
        userId:       users[1].id,
        serviceId:    service.id,
        scheduledAt:  slot,
        quantity:     4,
        honeyVariety: 'Girasol',
        apiarySource: 'Apiario Test B',
        status:       'PENDING',
      },
    ],
  });

  console.log(`✓ Created 2 overlapping PENDING appointments at ${slot.toLocaleString('es-AR')}`);
  console.log('→ Go to /admin/pending → confirm one → the other should show the conflict banner.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
