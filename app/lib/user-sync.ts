import { prisma } from '@/app/lib/prisma';
import { Prisma, Role } from '@/generated/prisma/client';

export async function syncUser(userId: string, email: string, name: string) {
  const workerIds = (process.env.WORKER_CLERK_USER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const role: Role =
    userId === process.env.ADMIN_CLERK_USER_ID ? 'ADMIN' :
    workerIds.includes(userId)                 ? 'WORKER' :
                                                 'CLIENT';

  try {
    await prisma.user.upsert({
      where:  { id: userId },
      update: { email, name },
      create: { id: userId, email, name, role },
    });
  } catch (e) {
    // Stale DB record (deleted Clerk user) holds the same email — remove it and retry
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      await prisma.user.deleteMany({ where: { email, NOT: { id: userId } } });
      await prisma.user.upsert({
        where:  { id: userId },
        update: { email, name },
        create: { id: userId, email, name, role },
      });
    } else {
      throw e;
    }
  }
}
