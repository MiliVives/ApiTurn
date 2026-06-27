import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN')  redirect('/admin/scheduler');
  if (user?.role === 'WORKER') redirect('/worker/active');
  redirect('/client');
}
