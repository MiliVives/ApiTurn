import { prisma } from '@/app/lib/prisma';
import { Role } from '@/generated/prisma/client';

export async function syncUser(userId: string, email: string, name: string) {
  const role: Role = userId === process.env.ADMIN_CLERK_USER_ID ? 'ADMIN' : 'CLIENT';

  await prisma.user.upsert({
    where: { id: userId },
    update: { email, name },
    create: { id: userId, email, name, role },
  });
}
