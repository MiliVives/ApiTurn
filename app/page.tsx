import Link from 'next/link';
import { cormorant } from '@/app/ui/fonts';
import { AuthButtons } from '@/app/ui/auth-buttons';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">

      {/* ══════════════════════════════════════════
          LEFT PANEL
      ══════════════════════════════════════════ */}
      <div
        className="relative flex-none w-full md:w-[48%] min-h-[55vw] md:min-h-screen overflow-hidden flex flex-col justify-between p-8 md:p-10"
        style={{ backgroundColor: '#1a1208' }}
      >
        {/* Honeycomb line texture */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ color: '#c9a84c' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hc" x="0" y="0" width="34" height="29.4" patternUnits="userSpaceOnUse">
                <polygon
                  points="17,1 32,9.7 32,27.1 17,35.8 2,27.1 2,9.7"
                  fill="none" stroke="currentColor" strokeWidth="0.6"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hc)" />
          </svg>
        </div>

        {/* Warm amber glow — simulates backlit honey */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 52% 52%, rgba(180,120,20,0.18) 0%, rgba(120,60,5,0.10) 40%, transparent 72%)',
          }}
        />

        {/* Decorative honeycomb cluster — centre visual */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            viewBox="-120 -110 240 232"
            className="w-[70%] md:w-[80%] max-w-lg opacity-[0.22]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="cellGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e8b84b" stopOpacity="1" />
                <stop offset="100%" stopColor="#7a4a08" stopOpacity="0.6" />
              </radialGradient>
              <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f0cc70" stopOpacity="1" />
                <stop offset="100%" stopColor="#c9840c" stopOpacity="0.8" />
              </radialGradient>
            </defs>
            {/* Centre cell */}
            <polygon points="0,-46 40,-23 40,23 0,46 -40,23 -40,-23" fill="url(#centerGrad)" />
            {/* Ring of 6 cells */}
            <polygon points="0,-126 40,-103 40,-57 0,-34 -40,-57 -40,-103" fill="url(#cellGrad)" />
            <polygon points="69,-80 109,-57 109,-11 69,12 29,-11 29,-57" fill="url(#cellGrad)" />
            <polygon points="69,12 109,35 109,81 69,104 29,81 29,35" fill="url(#cellGrad)" />
            <polygon points="0,46 40,69 40,115 0,138 -40,115 -40,69" fill="url(#cellGrad)" />
            <polygon points="-69,12 -29,35 -29,81 -69,104 -109,81 -109,35" fill="url(#cellGrad)" />
            <polygon points="-69,-80 -29,-57 -29,-11 -69,12 -109,-11 -109,-57" fill="url(#cellGrad)" />
          </svg>
        </div>

        {/* Vignette overlay — darkens edges like a photo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 40%, rgba(10,6,2,0.65) 100%)',
          }}
        />

        {/* ── Brand — top left ── */}
        <div className="relative z-10">
          <span
            className="text-[11px] font-light tracking-[0.5em]"
            style={{ color: '#c9a84c' }}
          >
            A P I T U R N
          </span>
        </div>

        {/* ── Tagline — bottom left ── */}
        <div className="relative z-10">
          <p
            className={`${cormorant.className} text-2xl md:text-3xl font-light leading-snug`}
            style={{ color: 'rgba(255,255,255,0.82)' }}
          >
            El Estándar de Excelencia
          </p>
          <p
            className={`${cormorant.className} text-2xl md:text-3xl italic leading-snug`}
            style={{ color: '#c9a84c' }}
          >
            en Logística Apícola.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px w-8 opacity-50" style={{ backgroundColor: '#c9a84c' }} />
            <span
              className="text-[10px] font-light tracking-[0.4em] opacity-70"
              style={{ color: '#c9a84c' }}
            >
              DESDE 2026
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL
      ══════════════════════════════════════════ */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center px-8 py-14 md:py-0"
        style={{ backgroundColor: '#f5f0e8' }}
      >
        <div className="w-full max-w-[460px]">

          {/* Label */}
          <p
            className="text-[9px] font-light tracking-[0.45em] mb-10"
            style={{ color: '#8a7a6a' }}
          >
            PORTAL DE ACCESO AL SISTEMA
          </p>

          {/* Heading */}
          <h1
            className={`${cormorant.className} text-5xl md:text-6xl font-light tracking-[0.04em] leading-[1.0] mb-5`}
            style={{ color: '#1a1208' }}
          >
            ACCEDE A<br />LA COLMENA
          </h1>

          {/* Subtitle */}
          <p
            className={`${cormorant.className} text-[1.15rem] italic leading-relaxed mb-11`}
            style={{ color: '#8a7a6a' }}
          >
            Acceso seguro para gestión de apiarios<br />
            y programación de extracciones.
          </p>

          {/* Clerk auth buttons */}
          <AuthButtons />

          {/* Secondary links */}
          <div className="flex justify-between mt-8">
            <Link
              href="/centro-de-ayuda"
              className="text-[9px] tracking-[0.3em] transition-opacity hover:opacity-60"
              style={{ color: '#8a7a6a' }}
            >
              CENTRO DE AYUDA
            </Link>
            <Link
              href="/normas-de-extraccion"
              className="text-[9px] tracking-[0.3em] transition-opacity hover:opacity-60"
              style={{ color: '#8a7a6a' }}
            >
              NORMAS DE EXTRACCIÓN
            </Link>
          </div>
        </div>

        {/* ── Status bar ── */}
        <div
          className="absolute bottom-0 left-0 right-0 border-t px-8 py-4 flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0"
          style={{ borderColor: '#d0c8bc' }}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#8a7a6a" strokeWidth="0.8" />
              <circle cx="6" cy="6" r="2" fill="#8a7a6a" opacity="0.4" />
            </svg>
            <span className="text-[8px] tracking-[0.22em]" style={{ color: '#8a7a6a' }}>
              NODO ENCRIPTADO SEGURO // SITIO-01
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#8a7a6a" strokeWidth="0.8" />
              <circle cx="6" cy="6" r="2" fill="#8a7a6a" opacity="0.4" />
            </svg>
            <span className="text-[8px] tracking-[0.22em]" style={{ color: '#8a7a6a' }}>
              ESTADO DEL SISTEMA: OPERATIVO
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
