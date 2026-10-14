/**
 * Iconos dibujados a mano (SVG): sin dependencias ni fuentes de iconos externas.
 * Todos heredan el color con currentColor.
 */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({ viewBox: '0 0 24 24', 'aria-hidden': true, ...props });

export const IconoFlechaAtras = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5 8 12l7 7" />
  </svg>
);

export const IconoPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
  </svg>
);

export const IconoOtraVez = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4h4" />
  </svg>
);

export const IconoAltavoz = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" fill="currentColor" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

export const IconoEstrella = ({ llena = true, ...p }: P & { llena?: boolean }) => (
  <svg {...base(p)} fill={llena ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
  </svg>
);

export const IconoCandado = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const IconoAlbum = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round">
    <path d="M4 4.5h11a3 3 0 0 1 3 3V20H7a3 3 0 0 1-3-3V4.5Z" fill="currentColor" fillOpacity={0.15} />
    <path d="M18 7.5h2V20h-2" />
    <path d="m11 8 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4L11 8Z" fill="currentColor" />
  </svg>
);

export const IconoBien = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconoMal = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round">
    <path d="M7 7l10 10M17 7 7 17" />
  </svg>
);

// ─── Iconos de las mecánicas ────────────────────────────────────────────────

export const IconoIntrusa = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={1.8} />
    <text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" fontFamily="Andika, sans-serif">a</text>
  </svg>
);

export const IconoBurbujas = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="9" cy="14" r="5.5" fill="currentColor" fillOpacity={0.2} />
    <circle cx="17" cy="7" r="3.5" fill="currentColor" fillOpacity={0.2} />
    <circle cx="18" cy="16" r="2" />
  </svg>
);

export const IconoTren = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <rect x="2" y="7" width="8" height="9" rx="1.5" />
    <rect x="3.5" y="4" width="3" height="3" rx="0.5" />
    <rect x="11.5" y="9" width="5" height="7" rx="1" fillOpacity={0.55} />
    <rect x="17.5" y="9" width="5" height="7" rx="1" fillOpacity={0.55} />
    <circle cx="5" cy="18" r="1.8" />
    <circle cx="14" cy="18" r="1.5" />
    <circle cx="20" cy="18" r="1.5" />
  </svg>
);

export const IconoLupa = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6" fill="currentColor" fillOpacity={0.15} />
    <path d="m15 15 5.5 5.5" />
  </svg>
);

export const IconoCohete = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <path d="M12 2c3 2.2 4.5 5.6 4.5 9.5V16h-9v-4.5C7.5 7.6 9 4.2 12 2Z" />
    <circle cx="12" cy="9.5" r="1.8" fill="white" />
    <path d="M7.5 12.5 4.5 16v2.5l3-1.5v-4.5ZM16.5 12.5l3 3.5v2.5l-3-1.5v-4.5Z" fillOpacity={0.7} />
    <path d="M10 17h4l-.8 4h-2.4L10 17Z" fill="#f39c12" />
  </svg>
);

export const IconoFantasma = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <path d="M12 2.5a7 7 0 0 0-7 7V21l2.3-1.8L9.6 21 12 19.2l2.4 1.8 2.3-1.8L19 21V9.5a7 7 0 0 0-7-7Z" />
    <circle cx="9.5" cy="10" r="1.3" fill="white" />
    <circle cx="14.5" cy="10" r="1.3" fill="white" />
  </svg>
);

export const IconoPillado = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" fill="currentColor" fillOpacity={0.15} />
    <path d="m15.5 15.5 5 5" />
    <path d="M10.5 7v4" strokeWidth={2.8} />
    <circle cx="10.5" cy="14" r="0.6" fill="currentColor" />
  </svg>
);

export const IconoLapiz = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round">
    <path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8 4 20Z" fill="currentColor" fillOpacity={0.15} />
    <path d="m14 6.6 3.4 3.4" />
  </svg>
);

export const IconoCartas = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
    <rect x="3" y="6" width="10" height="14" rx="2" transform="rotate(-10 8 13)" fill="currentColor" fillOpacity={0.15} />
    <rect x="11" y="4" width="10" height="14" rx="2" transform="rotate(8 16 11)" fill="currentColor" fillOpacity={0.3} />
  </svg>
);

export const IconoPulgar = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <path d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Zm2 0 3.6-6.3a1.6 1.6 0 0 1 3 .9L15 9h4.6a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 18.2 20H9V10Z" />
  </svg>
);

export const ICONO_MECANICA = {
  intrusa: IconoIntrusa,
  burbujas: IconoBurbujas,
  tren: IconoTren,
  detective: IconoLupa,
  carrera: IconoCohete,
  pillado: IconoPillado,
  dictado: IconoLapiz,
  parejas: IconoCartas,
} as const;
