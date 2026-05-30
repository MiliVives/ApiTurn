import Link from 'next/link';
import { cormorant } from '@/app/ui/fonts';

const sections = [
  {
    title: 'CONDICIONES DE LAS ALZAS',
    body: 'Las alzas deben estar limpias y libres de plagas. No se admiten alzas con residuos de tratamientos antivarroa en los últimos 14 días. Los cuadros deben estar operculados en al menos un 80 %. Se aceptan cuadros sin opercular únicamente con aviso previo al momento de la solicitud.',
  },
  {
    title: 'PRESENTACIÓN EN EL APIARIO',
    body: 'Presentate al punto de extracción con al menos 15 minutos de anticipación al turno asignado. Traé la confirmación impresa o digital de la solicitud. Las alzas deben transportarse en contenedores sellados para evitar la contaminación cruzada entre producciones.',
  },
  {
    title: 'HIGIENE Y SANIDAD',
    body: 'El extractor es higienizado entre cada lote. No ingreses cuadros con cría. Las alzas con signos de Loque Americana no serán aceptadas y deberán denunciarse ante el SENASA conforme a la normativa vigente (Resolución SENASA 59/2021).',
  },
  {
    title: 'DEVOLUCIÓN DE CERA Y ALZAS',
    body: 'Los marcos vacíos se devuelven el mismo día de la extracción. Los opérculos de cera pueden retirarse si así lo solicitás al momento de completar tu solicitud. No se almacenan materiales de productores entre sesiones.',
  },
  {
    title: 'CANCELACIONES Y REPROGRAMACIONES',
    body: 'Notificá cualquier cambio con un mínimo de 48 horas de anticipación. Las cancelaciones de último momento (menos de 12 horas antes del turno) sin aviso previo pueden afectar la prioridad asignada en futuros cronogramas.',
  },
];

export default function NormasDeExtraccionPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f0e8' }}>

      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 h-14"
        style={{ backgroundColor: '#1a1208' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-[9px] tracking-[0.3em] transition-opacity hover:opacity-70"
          style={{ color: '#c9a84c' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4" />
          </svg>
          VOLVER A INICIO
        </Link>
        <span className="text-[11px] font-light tracking-[0.5em]" style={{ color: '#c9a84c' }}>
          A P I T U R N
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 px-8 py-12 md:py-16" style={{ maxWidth: '768px', margin: '0 auto', width: '100%' }}>

        <p className="text-[9px] tracking-[0.4em] mb-3" style={{ color: '#8a7a6a' }}>
          REGLAMENTO OPERATIVO
        </p>
        <h1
          className={`${cormorant.className} text-5xl md:text-6xl font-light tracking-wide mb-3`}
          style={{ color: '#1a1208' }}
        >
          Normas de Extracción
        </h1>
        <p
          className={`${cormorant.className} text-xl italic mb-12`}
          style={{ color: '#8a7a6a' }}
        >
          Requisitos y condiciones para el ingreso de alzas al servicio de extracción.
        </p>

        {/* Divider */}
        <div className="h-px mb-10" style={{ backgroundColor: '#d0c8bc' }} />

        {/* Sections */}
        <div className="flex flex-col gap-8">
          {sections.map(({ title, body }, i) => (
            <div
              key={title}
              className="flex gap-5"
            >
              <span
                className="text-[9px] tracking-[0.2em] mt-0.5 shrink-0 w-5 text-right"
                style={{ color: '#c9a84c' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-[9px] font-medium tracking-[0.25em] mb-2" style={{ color: '#1a1208' }}>
                  {title}
                </p>
                <p className="text-[13px] font-light leading-relaxed" style={{ color: '#5a4e45' }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px my-12" style={{ backgroundColor: '#d0c8bc' }} />

        {/* Contact card */}
        <div
          className="rounded-sm p-6"
          style={{ border: '1px solid #d0c8bc', backgroundColor: '#ffffff' }}
        >
          <p
            className={`${cormorant.className} text-2xl font-light mb-5`}
            style={{ color: '#1a1208' }}
          >
            ¿Consultas sobre las normas?
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[9px] tracking-[0.25em] w-28 shrink-0" style={{ color: '#8a7a6a' }}>
                TELÉFONO
              </span>
              <span className="text-[12px] font-light" style={{ color: '#1a1208' }}>
                +54 9 11 0000-0000
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] tracking-[0.25em] w-28 shrink-0" style={{ color: '#8a7a6a' }}>
                CORREO
              </span>
              <span className="text-[12px] font-light" style={{ color: '#1a1208' }}>
                normas@apiturn.com.ar
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] tracking-[0.25em] w-28 shrink-0" style={{ color: '#8a7a6a' }}>
                HORARIO
              </span>
              <span className="text-[12px] font-light" style={{ color: '#1a1208' }}>
                Lunes a viernes, 8:00 – 17:00
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
