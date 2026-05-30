import Link from 'next/link';
import { cormorant } from '@/app/ui/fonts';

const faqs = [
  {
    q: '¿CÓMO SOLICITO UN TURNO?',
    a: 'Ingresá al portal con tu cuenta de productor y hacé clic en "Nueva Solicitud" en el menú lateral. Completá la variedad de miel, el apiario de origen, la cantidad de alzas y elegí un turno tentativo en el calendario. La solicitud quedará pendiente hasta que el administrador la confirme.',
  },
  {
    q: '¿QUÉ SIGNIFICA UN TURNO TENTATIVO?',
    a: 'El horario que elegís es una preferencia inicial. El administrador puede reorganizarlo para optimizar el cronograma diario del extractor. Cuando tu turno sea confirmado o modificado, recibirás una notificación en tu portal.',
  },
  {
    q: '¿CUÁNTO TIEMPO TARDA LA EXTRACCIÓN?',
    a: 'El tiempo estimado es de 1 hora base más 5 minutos por alza. Por ejemplo, 20 alzas representan aproximadamente 1 h 40 min. Si la cantidad de alzas supera la capacidad de un día, la solicitud se dividirá en sesiones.',
  },
  {
    q: '¿QUÉ PASA SI NO ME PRESENTO?',
    a: 'Los turnos confirmados que no sean atendidos dentro del horario asignado podrán ser cancelados automáticamente. Si necesitás reprogramar, avisanos con al menos 48 horas de anticipación para mantener tu prioridad en el calendario.',
  },
  {
    q: 'NOTIFICACIONES',
    a: 'El ícono de campana en tu dashboard muestra las notificaciones sin leer. Recibirás actualizaciones cada vez que el estado de tu solicitud cambie: pendiente → confirmado → en proceso → completado.',
  },
];

export default function CentroDeAyudaPage() {
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
          PORTAL DEL PRODUCTOR
        </p>
        <h1
          className={`${cormorant.className} text-5xl md:text-6xl font-light tracking-wide mb-3`}
          style={{ color: '#1a1208' }}
        >
          Centro de Ayuda
        </h1>
        <p
          className={`${cormorant.className} text-xl italic mb-12`}
          style={{ color: '#8a7a6a' }}
        >
          Encontrá respuestas a las preguntas más frecuentes sobre el sistema.
        </p>

        {/* Divider */}
        <div className="h-px mb-10" style={{ backgroundColor: '#d0c8bc' }} />

        {/* FAQ list */}
        <div className="flex flex-col gap-8">
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <p className="text-[9px] font-medium tracking-[0.25em] mb-2" style={{ color: '#1a1208' }}>
                {q}
              </p>
              <p className="text-[13px] font-light leading-relaxed" style={{ color: '#5a4e45' }}>
                {a}
              </p>
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
            ¿Necesitás más ayuda?
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
                ayuda@apiturn.com.ar
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
