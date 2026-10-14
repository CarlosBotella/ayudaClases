/**
 * CARRERA CONTRA TU FANTASMA
 * Lista de palabras; la niña lee en voz alta y el ADULTO marca acierto o
 * error con dos botones discretos. Un cohete compite contra el "fantasma" de
 * su mejor marca. Al final se calculan las palabras correctas por minuto (PCPM).
 * No se graba audio: el adulto es quien escucha.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { NivelCarrera } from '../datos/esquemas.ts';
import { calcularPcpm } from '../lib/estrellas.ts';
import type { MejorNivel } from '../lib/progreso.ts';
import { sonidoAcierto, sonidoFanfarria } from '../lib/sonidos.ts';
import Destellos from '../componentes/Destellos.tsx';
import { IconoBien, IconoCohete, IconoFantasma, IconoMal, IconoPlay } from '../componentes/Iconos.tsx';
import type { PropsJuego } from './tipos.ts';
import { esperar, patronDePalabra } from './utilidades.ts';

type Fase = 'preparada' | 'corriendo' | 'meta';

export default function JuegoCarrera({
  nivel,
  registrar,
  alTerminar,
  alAvanzar,
  mejor,
}: PropsJuego<NivelCarrera> & { mejor: MejorNivel | undefined }) {
  const [fase, setFase] = useState<Fase>('preparada');
  const [indice, setIndice] = useState(0);
  const [ahora, setAhora] = useState(0);
  const [ganador, setGanador] = useState<'cohete' | 'fantasma' | null>(null);
  const correctas = useRef(0);
  const inicio = useRef(0);
  const inicioPalabra = useRef(0);

  const total = nivel.palabras.length;
  // El fantasma tarda lo mismo que en su mejor partida.
  const duracionFantasma = mejor?.duracionMs;

  useEffect(() => {
    if (fase !== 'corriendo') return;
    const t = window.setInterval(() => setAhora(performance.now() - inicio.current), 100);
    return () => window.clearInterval(t);
  }, [fase]);

  const empezar = () => {
    inicio.current = performance.now();
    inicioPalabra.current = inicio.current;
    setAhora(0);
    setFase('corriendo');
  };

  const marcar = async (bien: boolean) => {
    if (fase !== 'corriendo') return;
    const palabra = nivel.palabras[indice] ?? '';
    registrar({
      item: palabra,
      unidadObjetivo: palabra,
      patron: patronDePalabra(palabra),
      respuesta: bien ? 'leída' : 'error',
      correcto: bien,
      errorTipo: null,
      latenciaMs: performance.now() - inicioPalabra.current,
      ayudas: 0,
      intentoN: 1,
    });
    inicioPalabra.current = performance.now();
    if (bien) correctas.current++;
    alAvanzar((indice + 1) / total);

    if (indice + 1 < total) {
      setIndice(indice + 1);
      return;
    }

    const duracion = performance.now() - inicio.current;
    const pcpm = calcularPcpm(correctas.current, duracion);
    const gana = mejor?.pcpm === undefined || pcpm > mejor.pcpm;
    setAhora(duracion);
    setFase('meta');
    setGanador(gana ? 'cohete' : 'fantasma');
    if (gana) sonidoFanfarria();
    else sonidoAcierto();
    await esperar(3200);
    alTerminar({ items: total, aciertosPrimera: correctas.current, pcpm, ganaAlFantasma: gana });
  };

  const avanceCohete = (fase === 'meta' ? total : indice) / total;
  const avanceFantasma = duracionFantasma ? Math.min(1, ahora / duracionFantasma) : 0;

  return (
    <div className="flex h-full flex-col px-6 pb-4">
      {/* Pista de carreras */}
      <div className="relative mx-auto mt-2 w-full max-w-4xl rounded-3xl bg-white/70 px-6 py-3 shadow-inner">
        {[
          { quien: 'cohete', avance: avanceCohete, Icono: IconoCohete, color: 'text-mar' },
          ...(duracionFantasma
            ? [{ quien: 'fantasma', avance: avanceFantasma, Icono: IconoFantasma, color: 'text-tinta/30' }]
            : []),
        ].map(({ quien, avance, Icono, color }) => (
          <div key={quien} className="relative my-1 h-16 border-b-4 border-dashed border-arena">
            <motion.div
              className={`absolute top-0 ${color}`}
              animate={{ left: `calc(${avance * 100}% - ${avance * 64}px)` }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            >
              <Icono className={`size-16 ${quien === 'cohete' ? 'rotate-90' : ''}`} />
            </motion.div>
          </div>
        ))}
        <div className="absolute inset-y-2 right-4 w-2 rounded bg-sol" aria-hidden="true" />
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          {fase === 'preparada' && (
            <motion.button
              key="ya"
              type="button"
              onClick={empezar}
              exit={{ scale: 0, opacity: 0 }}
              className="flex size-40 items-center justify-center rounded-full bg-sol text-white shadow-[0_10px_0_0_#d9952a] active:translate-y-2"
              aria-label="Empezar la carrera"
            >
              <IconoPlay className="ml-3 size-20" />
            </motion.button>
          )}
          {fase === 'corriendo' && (
            <motion.p
              key={indice}
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -200, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="texto-lectura text-[110px] font-bold text-tinta"
            >
              {nivel.palabras[indice]}
            </motion.p>
          )}
          {fase === 'meta' && ganador && (
            <motion.div key="meta" initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="relative flex flex-col items-center">
              {ganador === 'cohete' && <Destellos disparo={1} radio={200} />}
              {ganador === 'cohete' ? (
                <IconoCohete className="size-48 text-mar" />
              ) : (
                <IconoFantasma className="size-40 text-tinta/40" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Botones del ADULTO: discretos, abajo a la derecha */}
      {fase === 'corriendo' && (
        <div className="flex items-center justify-end gap-4" aria-label="Botones para el adulto">
          <span className="mr-2 font-sans text-base text-tinta/50">Adulto, ¿la ha leído bien?</span>
          <button
            type="button"
            onClick={() => void marcar(false)}
            aria-label="La ha leído mal"
            className="flex h-16 items-center gap-2 rounded-full bg-white/60 px-5 font-sans text-lg font-bold text-tinta/50 active:scale-95"
          >
            <IconoMal className="size-7" /> mal
          </button>
          <button
            type="button"
            onClick={() => void marcar(true)}
            aria-label="La ha leído bien"
            className="flex h-16 items-center gap-2 rounded-full bg-white/60 px-5 font-sans text-lg font-bold text-mar/70 active:scale-95"
          >
            <IconoBien className="size-7" /> bien
          </button>
        </div>
      )}
    </div>
  );
}
