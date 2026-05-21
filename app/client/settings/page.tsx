import { cormorant } from '@/app/ui/fonts';

export default function SettingsPage() {
  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>PORTAL DEL PRODUCTOR</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-4`} style={{ color: 'var(--dark)' }}>
        CONFIGURACIÓN
      </h1>
      <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--muted)' }}>
        Próximamente.
      </p>
    </div>
  );
}
