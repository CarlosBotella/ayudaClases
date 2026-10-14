/**
 * Puerta parental: mantener pulsado 3 s y resolver una suma sencilla.
 * Protege la salida del modo niña y la entrada al panel del tutor.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconoCandado } from './Iconos.tsx';

const MANTENER_MS = 3000;

function nuevaSuma(): { a: number; b: number; opciones: number[] } {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const correcta = a + b;
  const opciones = new Set([correcta]);
  while (opciones.size < 4) {
    const o = correcta + Math.floor(Math.random() * 9) - 4;
    if (o > 1) opciones.add(o);
  }
  return { a, b, opciones: [...opciones].sort(() => Math.random() - 0.5) };
}

export default function PuertaParental({ onAbrir, className = '' }: { onAbrir: () => void; className?: string }) {
  const [progreso, setProgreso] = useState(0);
  const [suma, setSuma] = useState<ReturnType<typeof nuevaSuma> | null>(null);
  const inicio = useRef<number | null>(null);
  const marco = useRef<number | null>(null);

  const parar = useCallback(() => {
    inicio.current = null;
    if (marco.current !== null) cancelAnimationFrame(marco.current);
    marco.current = null;
    setProgreso(0);
  }, []);

  const avanzar = useCallback(() => {
    if (inicio.current === null) return;
    const p = Math.min(1, (performance.now() - inicio.current) / MANTENER_MS);
    setProgreso(p);
    if (p >= 1) {
      parar();
      setSuma(nuevaSuma());
    } else {
      marco.current = requestAnimationFrame(avanzar);
    }
  }, [parar]);

  useEffect(() => parar, [parar]);

  const empezar = () => {
    inicio.current = performance.now();
    marco.current = requestAnimationFrame(avanzar);
  };

  const radio = 26;
  const circunferencia = 2 * Math.PI * radio;

  return (
    <>
      <button
        type="button"
        aria-label="Zona de adultos: mantén pulsado"
        onPointerDown={empezar}
        onPointerUp={parar}
        onPointerLeave={parar}
        onPointerCancel={parar}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative flex size-16 items-center justify-center rounded-full bg-white/70 text-mar-oscuro/60 ${className}`}
        style={{ touchAction: 'none' }}
      >
        <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={radio}
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            strokeDasharray={circunferencia}
            strokeDashoffset={circunferencia * (1 - progreso)}
            strokeLinecap="round"
          />
        </svg>
        <IconoCandado className="size-7" />
      </button>

      <AnimatePresence>
        {suma && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-full max-w-md rounded-3xl bg-crema p-8 text-center font-sans shadow-xl">
              <p className="text-lg text-tinta/70">Solo para adultos</p>
              <p className="my-4 text-5xl font-bold text-tinta">
                {suma.a} + {suma.b} = ?
              </p>
              <div className="grid grid-cols-2 gap-4">
                {suma.opciones.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="min-h-16 rounded-2xl bg-white text-3xl font-bold text-mar shadow"
                    onClick={() => {
                      if (o === suma.a + suma.b) {
                        setSuma(null);
                        onAbrir();
                      } else {
                        setSuma(nuevaSuma());
                      }
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <button type="button" className="mt-6 min-h-12 px-6 text-lg text-tinta/60 underline" onClick={() => setSuma(null)}>
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
