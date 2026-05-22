import { auth, currentUser } from '@clerk/nextjs/server';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';

export default async function SettingsPage() {
  const { userId } = await auth();
  const clerkUser = await currentUser();
  if (!userId || !clerkUser) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });

  const fields = [
    { label: 'NOMBRE COMPLETO', value: dbUser?.name ?? `${clerkUser.firstName} ${clerkUser.lastName}`.trim() },
    { label: 'CORREO ELECTRÓNICO', value: clerkUser.emailAddresses[0]?.emailAddress ?? '—' },
    { label: 'ID DE CLIENTE', value: `...${userId.slice(-12).toUpperCase()}` },
    { label: 'ROL EN EL SISTEMA', value: dbUser?.role === 'ADMIN' ? 'ADMINISTRADOR' : 'PRODUCTOR' },
    {
      label: 'MIEMBRO DESDE',
      value: dbUser?.createdAt
        ? dbUser.createdAt.toLocaleDateString('es-AR', { dateStyle: 'long' })
        : '—',
    },
  ];

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>PORTAL DEL PRODUCTOR</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`} style={{ color: 'var(--dark)' }}>
        CONFIGURACIÓN
      </h1>
      <p className={`${cormorant.className} text-lg italic mb-8`} style={{ color: 'var(--muted)' }}>
        Información de tu cuenta.
      </p>

      <div className="max-w-lg flex flex-col gap-px border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {fields.map(({ label, value }, i) => (
          <div
            key={label}
            className="flex flex-col sm:flex-row sm:items-center gap-1 px-6 py-4"
            style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#faf8f4' }}
          >
            <p className="text-[8px] tracking-[0.3em] sm:w-48 shrink-0" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{value}</p>
          </div>
        ))}
      </div>

      <p className="text-[9px] tracking-[0.2em] mt-8" style={{ color: 'var(--border)' }}>
        Para modificar tu nombre o correo, gestiona tu cuenta desde el botón de perfil en el panel lateral.
      </p>
    </div>
  );
}
