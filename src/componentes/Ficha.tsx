/**
 * Ficha tocable con el feedback de la app:
 *  - error: tiembla y se tiñe de naranja suave ~400 ms, y SIGUE en su sitio;
 *  - pista: late suavemente (tras dos errores en el mismo ítem).
 * El error se dispara cuando aumenta `fallos`.
 */
import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export const DURACION_ERROR_MS = 400;

interface Props {
  children: ReactNode;
  onClick?: () => void;
  /** Contador de fallos: cada vez que sube, la ficha tiembla. */
  fallos?: number;
  pista?: boolean;
  seleccionada?: boolean;
  desactivada?: boolean;
  className?: string;
  /** Clase de color normal (se sustituye por naranja durante el error). */
  colorNormal?: string;
  etiqueta?: string;
  layoutId?: string;
}

export default function Ficha({
  children,
  onClick,
  fallos = 0,
  pista = false,
  seleccionada = false,
  desactivada = false,
  className = '',
  colorNormal = 'bg-white',
  etiqueta,
  layoutId,
}: Props) {
  const controles = useAnimationControls();
  const [naranja, setNaranja] = useState(false);
  const previo = useRef(fallos);

  useEffect(() => {
    if (fallos <= previo.current) {
      previo.current = fallos;
      return;
    }
    previo.current = fallos;
    setNaranja(true);
    void controles.start({ x: [0, -14, 14, -10, 10, -4, 0], transition: { duration: DURACION_ERROR_MS / 1000 } });
    const t = window.setTimeout(() => setNaranja(false), DURACION_ERROR_MS);
    return () => window.clearTimeout(t);
  }, [fallos, controles]);

  return (
    <motion.div
      layoutId={layoutId}
      animate={pista ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={pista ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      className="inline-flex"
    >
      <motion.button
        type="button"
        animate={controles}
        onClick={desactivada ? undefined : onClick}
        aria-label={etiqueta}
        aria-disabled={desactivada}
        className={`select-none transition-colors duration-150 ${naranja ? 'bg-naranja-suave' : colorNormal} ${
          pista ? 'ring-4 ring-sol' : ''
        } ${seleccionada ? 'ring-4 ring-mar' : ''} ${className}`}
      >
        {children}
      </motion.button>
    </motion.div>
  );
}
