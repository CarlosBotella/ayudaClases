/**
 * Pantalla de explicación al empezar un nivel: icono grande, frase corta que
 * suena sola, nota para el adulto (pequeña) y un botón grande para empezar.
 */
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import type { Mecanica } from '../datos/esquemas.ts';
import { hablar } from '../lib/voz.ts';
import { ICONO_MECANICA, IconoAltavoz, IconoPlay } from '../componentes/Iconos.tsx';
import type { Instruccion } from './instrucciones.ts';

export default function PantallaInstrucciones({
  mecanica,
  instruccion,
  onEmpezar,
}: {
  mecanica: Mecanica;
  instruccion: Instruccion;
  onEmpezar: () => void;
}) {
  const { nina, adulto } = instruccion;
  const Icono = ICONO_MECANICA[mecanica];

  useEffect(() => {
    const t = window.setTimeout(() => hablar(nina), 400);
    return () => window.clearTimeout(t);
  }, [nina]);

  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center gap-6">
        <span className="flex size-32 items-center justify-center rounded-full bg-mar text-white shadow-lg">
          <Icono className="size-20" />
        </span>
        <button
          type="button"
          onClick={() => hablar(nina)}
          aria-label="Escuchar otra vez"
          className="flex size-20 items-center justify-center rounded-full bg-white text-mar shadow-md active:scale-95"
        >
          <IconoAltavoz className="size-11" />
        </button>
      </div>

      <p className="max-w-3xl text-center font-sans text-4xl font-bold leading-snug text-tinta">{nina}</p>

      {adulto && (
        <p className="max-w-2xl rounded-2xl bg-white/70 px-5 py-3 text-center font-sans text-lg text-tinta/70">
          <strong>Para el adulto:</strong> {adulto}
        </p>
      )}

      <button
        type="button"
        onClick={onEmpezar}
        aria-label="¡A jugar!"
        className="mt-2 flex size-28 items-center justify-center rounded-full bg-sol text-white shadow-[0_8px_0_0_#d9952a] active:translate-y-2"
      >
        <IconoPlay className="ml-2 size-14" />
      </button>
    </motion.div>
  );
}
