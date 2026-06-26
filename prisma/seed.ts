import 'dotenv/config';
import { PrismaClient, UrgencyLevel } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

// ─── Data ─────────────────────────────────────────────────────────────────────

const CLIENTS = [
  { id: 'seed_user_mgh2k9x1', name: 'Marcos Gutiérrez', email: 'marcos.gutierrez@apicultores.ar' },
  { id: 'seed_user_lva5p3w8', name: 'Laura Vázquez',    email: 'lvazquez@colmenares.com' },
  { id: 'seed_user_rfe7j2n4', name: 'Ricardo Ferreyra', email: 'r.ferreyra@mieldelsuelo.ar' },
  { id: 'seed_user_abn1q6t5', name: 'Ana Belén Nieto',  email: 'anieto@apicampo.com.ar' },
  { id: 'seed_user_crs4d8y0', name: 'Carlos Ruiz Sosa', email: 'cruizsosa@gmail.com' },
  { id: 'seed_user_pml3h7z6', name: 'Patricia Molina',  email: 'pmolina@estanciaelmonte.ar' },
  { id: 'seed_user_joa9w5k2', name: 'Jorge Olivares',   email: 'jolivares@colmenasur.com' },
  { id: 'seed_user_sbd6f1c3', name: 'Sofía Bravo',      email: 'sbravo@mielpatagonico.ar' },
  { id: 'seed_user_ehr8m4v7', name: 'Eduardo Herrera',  email: 'eherrera@apitucu.com' },
  { id: 'seed_user_fna0q9r5', name: 'Florencia Nadal',  email: 'fnadal@colmenareal.com.ar' },
];

const APIARIES = [
  'Apiario La Esperanza — Córdoba',
  'Estancia El Monte — Entre Ríos',
  'Campo Flores — Buenos Aires',
  'Apiario Patagónico — Neuquén',
  'Colmenar del Sur — Mendoza',
];

const VARIETIES = [
  'Abrepuño', 'Abrepuño y Flor Amarilla', 'Alfalfa', 'Alfalfa y Girasol',
  'Flor Amarilla', 'Girasol', 'Monte', 'Variada', 'Vicia', 'Vicia y Abrepuño',
];
const URGENCIES: UrgencyLevel[] = ['STANDARD', 'STANDARD', 'STANDARD', 'PRIORITY', 'IMMEDIATE'];

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  // Only afternoon hours to avoid any appointment crossing the 12–13 lunch break
  d.setHours([13, 14, 15, 16][Math.floor(Math.random() * 4)], 0, 0, 0);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database…');

  // Clean existing seed data (keep real users)
  await prisma.notification.deleteMany({ where: { userId: { startsWith: 'seed_' } } });
  await prisma.appointment.deleteMany({ where: { userId: { startsWith: 'seed_' } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: 'seed_' } } });

  // Upsert service
  const service = await prisma.service.upsert({
    where: { id: 'service_extraccion_miel' },
    update: {},
    create: {
      id: 'service_extraccion_miel',
      name: 'Extracción de Miel',
      description: 'Servicio completo de extracción, centrifugado y envasado de miel.',
      durationMin: 480,
      isActive: true,
    },
  });

  // Create clients
  const users = await Promise.all(
    CLIENTS.map(c =>
      prisma.user.create({ data: { id: c.id, email: c.email, name: c.name, role: 'CLIENT' } })
    )
  );

  const appts: { id: string; userId: string; email: string; name: string; status: string; scheduledAt: Date }[] = [];

  // ── 10 PENDING (next week +) — starts at +8 so they never land in the current week ──
  for (let i = 0; i < 10; i++) {
    const user = users[i % users.length];
    const a = await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        scheduledAt: daysFromNow(8 + i),
        status: 'PENDING',
        honeyVariety: pick(VARIETIES),
        quantity: 4 + Math.floor(Math.random() * 9),  // 4–12 → 80–120 min, fits in afternoon
        urgencyLevel: pick(URGENCIES),
        apiarySource: pick(APIARIES),
        notes: Math.random() > 0.5 ? 'Acceso por ruta provincial. Avisar con anticipación.' : null,
      },
    });
    appts.push({ id: a.id, userId: user.id, email: user.email, name: user.name, status: 'PENDING', scheduledAt: a.scheduledAt });
  }

  // ── 15 CONFIRMED (next week +) ─────────────────────────────────────────────
  for (let i = 0; i < 15; i++) {
    const user = users[i % users.length];
    const a = await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        scheduledAt: daysFromNow(9 + i * 2),
        status: 'CONFIRMED',
        honeyVariety: pick(VARIETIES),
        quantity: 4 + Math.floor(Math.random() * 9),  // 4–12 → 80–120 min, fits in afternoon
        urgencyLevel: pick(URGENCIES),
        apiarySource: pick(APIARIES),
      },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        appointmentId: a.id,
        type: 'CONFIRMED',
        message: `Tu solicitud de extracción ha sido confirmada para el ${a.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'long' })}.`,
        read: Math.random() > 0.4,
      },
    });
    appts.push({ id: a.id, userId: user.id, email: user.email, name: user.name, status: 'CONFIRMED', scheduledAt: a.scheduledAt });
  }

  // ── 3 IN_PROGRESS (next week, not current) ───────────────────────────────
  for (let i = 0; i < 3; i++) {
    const user = users[i];
    await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        scheduledAt: daysFromNow(7 + i),
        status: 'IN_PROGRESS',
        honeyVariety: pick(VARIETIES),
        quantity: 6,
        urgencyLevel: 'STANDARD',
        apiarySource: pick(APIARIES),
      },
    });
  }

  // ── 15 COMPLETED (past 6 weeks) ────────────────────────────────────────────
  for (let i = 0; i < 15; i++) {
    const user = users[i % users.length];
    await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        scheduledAt: daysFromNow(-5 - i * 3),
        status: 'COMPLETED',
        honeyVariety: pick(VARIETIES),
        quantity: 10 + Math.floor(Math.random() * 20),
        urgencyLevel: pick(URGENCIES),
        apiarySource: pick(APIARIES),
      },
    });
  }

  // ── 7 CANCELLED (past 4 weeks) ────────────────────────────────────────────
  const CANCEL_REASONS = [
    'Condiciones climáticas adversas.',
    'Apiario no disponible en la fecha acordada.',
    'Solicitud duplicada del productor.',
    'Equipo de extracción en mantenimiento.',
    'Cancelado a pedido del productor.',
  ];
  for (let i = 0; i < 7; i++) {
    const user = users[(i + 3) % users.length];
    const reason = pick(CANCEL_REASONS);
    const a = await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        scheduledAt: daysFromNow(-3 - i * 4),
        status: 'CANCELLED',
        honeyVariety: pick(VARIETIES),
        quantity: 6 + i,
        urgencyLevel: 'STANDARD',
        apiarySource: pick(APIARIES),
        adminNotes: reason,
      },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        appointmentId: a.id,
        type: 'CANCELLED',
        message: `Tu solicitud de extracción fue cancelada. Motivo: ${reason}`,
        read: Math.random() > 0.3,
      },
    });
  }

  // ── OPTIMIZER TEST: 5 CONFIRMED in current week (one per day Mon–Fri) ────────
  // quantity=8 → estimateDuration(8)=100min → ceil(100/30)=4 slots each
  // Spread one per day so compaction is clearly visible (expected: Mon×3 + Tue×2)
  function mondayOfCurrentWeek(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const OPT_HOURS = [9, 10, 13, 14, 15];  // one per day, no midnight-crossing gaps
  const monday = mondayOfCurrentWeek();
  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length];
    const apptDate = new Date(monday);
    apptDate.setDate(monday.getDate() + i);   // Mon, Tue, Wed, Thu, Fri
    apptDate.setHours(OPT_HOURS[i], 0, 0, 0);
    await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        scheduledAt: apptDate,
        status: 'CONFIRMED',
        honeyVariety: pick(VARIETIES),
        quantity: 8,
        urgencyLevel: 'STANDARD',
        apiarySource: pick(APIARIES),
        loteNumber: `900${i + 1}/26`,
        loteDate: new Date(),
      },
    });
  }

  console.log(`✓ Created ${users.length} clients`);
  console.log(`✓ Seeded 55 appointments (10 PENDING, 21 CONFIRMED, 3 IN_PROGRESS, 15 COMPLETED, 7 CANCELLED)`);
  console.log(`✓ 5 CONFIRMED optimizer-test appointments in current week (Mon–Fri)`);
  console.log(`✓ Created notifications for actioned appointments`);

  // ── Worker Clerk account + DB user ───────────────────────────────────────────
  const workerClerkId = await ensureWorkerClerkAccount();
  if (workerClerkId) {
    await prisma.user.upsert({
      where:  { id: workerClerkId },
      update: { role: 'WORKER', email: 'worker@apiturn.com', name: 'Operario Planta' },
      create: { id: workerClerkId, email: 'worker@apiturn.com', name: 'Operario Planta', role: 'WORKER' },
    });
    console.log(`✓ Worker DB user upserted (${workerClerkId})`);
    console.log(`  → Add to .env.local:  WORKER_CLERK_USER_IDS=${workerClerkId}`);
  }
}

// ─── Clerk worker account ─────────────────────────────────────────────────────

async function ensureWorkerClerkAccount(): Promise<string | null> {
  const sk = process.env.CLERK_SECRET_KEY;
  if (!sk) {
    console.warn('⚠  CLERK_SECRET_KEY not set — skipping worker Clerk account creation.');
    return null;
  }

  const workerEmail = 'worker@apiturn.com';
  const base = 'https://api.clerk.com/v1';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${sk}`,
    'Content-Type': 'application/json',
  };

  // Check if user already exists
  const listRes = await fetch(`${base}/users?email_address=${workerEmail}`, { headers });
  const list = await listRes.json() as { total_count: number; data: Array<{ id: string }> };

  if (list.total_count > 0) {
    console.log('✓ Worker Clerk account already exists');
    return list.data[0].id;
  }

  // Create new user
  const createRes = await fetch(`${base}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email_address: [workerEmail],
      username: 'operario_planta',
      password: 'WorkerApiturn2026!',
      first_name: 'Operario',
      last_name: 'Planta',
      skip_password_checks: true,
    }),
  });
  const created = await createRes.json() as { id?: string; errors?: unknown };

  if (!created.id) {
    console.error('✗ Failed to create Clerk worker account:', created.errors ?? created);
    return null;
  }

  console.log(`✓ Created Clerk worker account: ${created.id}`);
  return created.id;
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
