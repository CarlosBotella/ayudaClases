import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatearFechaCorta } from '../lib/fecha.ts';
import { hablar, prepararVoz } from '../lib/voz.ts';

/** ¿Se está ejecutando como app instalada (pantalla completa) o en el navegador? */
function useModoApp(): boolean {
  const consulta = '(display-mode: standalone)';
  const [esApp, setEsApp] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const alCambiar = (e: MediaQueryListEvent) => setEsApp(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  // iPad/iPhone antiguos exponen navigator.standalone en lugar de display-mode.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return esApp || iosStandalone;
}

/**
 * Bienvenida: se muestra mientras la app no puede jugar todavía (Firebase sin
 * configurar o sin conexión la primera vez). Incluye datos útiles para el
 * adulto: voz disponible, modo app y versión.
 */
export default function Bienvenida({ aviso }: { aviso?: string }) {
  const esApp = useModoApp();
  const [saludo, setSaludo] = useState(false);
  // Nombre de la voz en español del dispositivo; '' = sin voz; null = aún cargando.
  const [voz, setVoz] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    void prepararVoz().then((v) => {
      if (activo) setVoz(v ? v.name : '');
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <main className="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden px-6">
      {/* Olas decorativas al fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-t-[50%] bg-arena"
      />

      <h1
        className={`texto-lectura relative text-[120px] font-bold transition-all duration-300 ${
          saludo ? '-translate-y-4 scale-125 text-sol' : 'scale-100 text-mar'
        }`}
      >
        hola
      </h1>

      <button
        type="button"
        onClick={() => {
          hablar('hola');
          setSaludo(true);
          window.setTimeout(() => setSaludo(false), 700);
        }}
        aria-label="Decir hola"
        className="relative flex size-28 items-center justify-center rounded-full bg-sol shadow-[0_8px_0_0_#d9952a] transition active:translate-y-2 active:shadow-[0_0_0_0_#d9952a]"
      >
        {/* Triángulo de "play" */}
        <svg viewBox="0 0 24 24" className="ml-2 size-14 fill-white" aria-hidden="true">
          <path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z" />
        </svg>
      </button>

      {aviso && (
        <p className="relative max-w-xl rounded-2xl bg-white/80 px-6 py-3 text-center font-sans text-lg text-tinta/80">
          {aviso}
        </p>
      )}

      {/* Información discreta para el adulto */}
      <footer className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-4 font-sans text-sm text-mar-oscuro/70">
        <span className="flex gap-5">
          <Link to="/creditos" className="underline underline-offset-4">
            Créditos
          </Link>
          <Link to="/admin" className="underline underline-offset-4">
            Panel del tutor
          </Link>
        </span>
        <span>
          {voz === null ? 'Buscando voz…' : voz ? `Voz: ${voz}` : 'Sin voz en español'} ·{' '}
          {esApp ? 'Abierta como app' : 'Abierta en el navegador'} · versión{' '}
          {formatearFechaCorta(__BUILD_TIME__)}
        </span>
      </footer>
    </main>
  );
}
