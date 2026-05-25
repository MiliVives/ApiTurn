import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const rows = await prisma.appointment.findMany({
    where: {
      userId,
      apiarySource: { not: null },
      status: { in: ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS'] },
    },
    select: { apiarySource: true },
    orderBy: { scheduledAt: 'desc' },
  });

  const unique = [...new Set(rows.map(r => r.apiarySource!))];
  return NextResponse.json(unique);
}
