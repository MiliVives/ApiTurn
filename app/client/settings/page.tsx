import { auth, currentUser } from '@clerk/nextjs/server';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';
import { RenapaForm } from './renapa-form';

export default async function SettingsPage() {
  const { userId } = await auth();
  const clerkUser = await currentUser();
  if (!userId || !clerkUser) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const hasPendingData = !dbUser?.renapaNumber;

  const profileFields = [
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

      {/* Pending data alert */}
      {hasPendingData && (
        <div
          className="flex items-start gap-4 mb-8 px-5 py-4 border"
          style={{ borderColor: 'rgba(201,168,76,0.45)', backgroundColor: 'rgba(201,168,76,0.06)' }}
        >
          <span
            className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-medium mt-0.5"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--dark)' }}
          >
            !
          </span>
          <div>
            <p className="text-[9px] tracking-[0.3em] mb-1" style={{ color: 'var(--gold)' }}>
              DATOS PENDIENTES
            </p>
            <p className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--dark)' }}>
              Para solicitar turnos de extracción es necesario registrar tu número de RENAPA. Completalo en la sección a continuación.
            </p>
          </div>
        </div>
      )}

      {/* Profile info */}
      <p className="text-[9px] tracking-[0.3em] mb-3" style={{ color: 'var(--muted)' }}>PERFIL</p>
      <div className="max-w-lg flex flex-col gap-px border overflow-hidden mb-8" style={{ borderColor: 'var(--border)' }}>
        {profileFields.map(({ label, value }, i) => (
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

      {/* RENAPA section */}
      <p className="text-[9px] tracking-[0.3em] mb-3" style={{ color: 'var(--muted)' }}>
        DATOS APÍCOLAS REQUERIDOS
      </p>
      <div className="max-w-lg border overflow-hidden mb-8" style={{ borderColor: hasPendingData ? 'rgba(201,168,76,0.45)' : 'var(--border)' }}>
        <div className="px-6 py-5" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[8px] tracking-[0.3em] sm:w-48 shrink-0" style={{ color: 'var(--muted)' }}>
              NÚMERO RENAPA
            </span>
            {!dbUser?.renapaNumber && (
              <span
                className="text-[7px] tracking-[0.25em] px-2 py-0.5"
                style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}
              >
                PENDIENTE
              </span>
            )}
          </div>
          <RenapaForm current={dbUser?.renapaNumber ?? null} />
        </div>
      </div>

      <p className="text-[9px] tracking-[0.2em] mt-4" style={{ color: 'var(--muted)' }}>
        Para modificar tu nombre o correo, gestioná tu cuenta desde el botón de perfil en el panel lateral.
      </p>
    </div>
  );
}
