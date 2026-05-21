import { cormorant } from '@/app/ui/fonts';

export default function LogisticsPage() {
  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>GESTIÓN</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-4`} style={{ color: 'var(--dark)' }}>
        LOGÍSTICA
      </h1>
      <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--muted)' }}>
        Próximamente.
      </p>
    </div>
  );
}
