/**
 * Celebración de final de sesión (tras ~10 minutos de juego).
 */
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispositivo, useSesionNina } from '../sesion/SesionNina.tsx';
import { sonidoFanfarria } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Destellos from '../componentes/Destellos.tsx';
import { IconoEstrella, IconoPlay } from '../componentes/Iconos.tsx';

export default function Celebracion() {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const { reiniciarSesion } = useSesionNina();
  const nombre = sesion?.dispositivo.nombre ?? '';

  useEffect(() => {
    sonidoFanfarria();
    const t = window.setTimeout(() => hablar(`¡Muy bien, ${nombre}! ¡Qué bien has leído hoy!`), 600);
    return () => window.clearTimeout(t);
  }, [nombre]);

  return (
    <main className="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden bg-gradient-to-b from-crema to-sol/30">
      {/* Lluvia de estrellas */}
      {Array.from({ length: 18 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute text-sol"
          style={{ left: `${(i * 37) % 100}%` }}
          initial={{ y: -80, rotate: 0 }}
          animate={{ y: '110vh', rotate: 360 }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: (i % 6) * 0.4, ease: 'linear' }}
        >
          <IconoEstrella className="size-12" />
        </motion.div>
      ))}

      <motion.div
        className="relative rounded-[48px] bg-white px-14 py-8 shadow-2xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 12 }}
      >
        <Destellos disparo={1} radio={260} />
        <p className="texto-lectura text-center text-[88px] font-bold text-mar">¡bien!</p>
      </motion.div>

      <button
        type="button"
        aria-label="Volver al mapa"
        onClick={() => {
          reiniciarSesion();
          navegar('/', { replace: true });
        }}
        className="relative flex size-28 items-center justify-center rounded-full bg-sol text-white shadow-[0_8px_0_0_#d9952a] active:translate-y-2"
      >
        <IconoPlay className="ml-2 size-14" />
      </button>
    </main>
  );
}
