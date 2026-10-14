/**
 * DICTADO AL CUADERNO
 * La tablet dicta una palabra; ella la escribe EN PAPEL, en su cuaderno.
 * Después ve la palabra bien escrita, la compara con la suya y el adulto
 * marca si está bien (y, si quiere, qué tipo de error ha visto).
 * Sin fotos: en la app solo queda el resultado.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TipoErrorDatos } from '../../datos/esquemas.ts';
import { crearAleatorio } from '../../lib/aleatorio.ts';
import { sonidoAcierto } from '../../lib/sonidos.ts';
import { hablar } from '../../lib/voz.ts';
import { IconoAltavoz, IconoBien, IconoLapiz, IconoMal } from '../../componentes/Iconos.tsx';
import Pictograma from '../../componentes/Pictograma.tsx';
import { esperar } from '../utilidades.ts';
import { grafemasParaDictado, type PalabraJuego } from '../profe/generar.ts';
import type { PropsJuegoProfe } from '../profe/tipos.ts';

const RONDAS = 5;

/** Palabras para el cuaderno: más cortas y sin tilde en los escalones bajos. */
export function palabrasParaCuaderno(palabras: readonly PalabraJuego[], escalon: number, semilla: number): PalabraJuego[] {
  const rnd = crearAleatorio(semilla);
  const max = [4, 5, 6, 7, 99][Math.min(5, Math.max(1, escalon)) - 1] ?? 6;
  const aptas = palabras.filter(
    (p) => grafemasParaDictado(p.texto).length <= max && (escalon >= 3 || !/[áéíóú]/.test(p.texto)),
  );
  return rnd.barajar(aptas.length >= RONDAS ? aptas : palabras).slice(0, RONDAS);
}

const TIPOS: Array<{ tipo: TipoErrorDatos; etiqueta: string }> = [
  { tipo: 'sustitucion', etiqueta: 'letra cambiada' },
  { tipo: 'omision', etiqueta: 'falta una letra' },
  { tipo: 'inversion', etiqueta: 'letras desordenadas' },
  { tipo: 'espejo', etiqueta: 'letra en espejo (b/d)' },
];

type Fase = 'escribir' | 'comprobar' | 'tipo';

export default function JuegoCuaderno({ palabras, escalon, registrar, alTerminar, alAvanzar }: PropsJuegoProfe) {
  const rondas = useMemo(() => palabrasParaCuaderno(palabras, escalon, Date.now()), [palabras, escalon]);
  const [indice, setIndice] = useState(0);
  const [fase, setFase] = useState<Fase>('escribir');
  const aciertos = useRef(0);
  const inicio = useRef(performance.now());
  const palabra = rondas[indice];

  const dictar = (p: string) => {
    hablar(`Escribe en tu cuaderno: ${p}.`);
    window.setTimeout(() => hablar(p), 2600);
  };

  useEffect(() => {
    if (!palabra) return;
    inicio.current = performance.now();
    const t = window.setTimeout(() => dictar(palabra.texto), 500);
    return () => window.clearTimeout(t);
  }, [palabra]);

  if (!palabra) return null;

  const siguiente = async (bien: boolean, errorTipo: TipoErrorDatos | null) => {
    registrar({
      item: palabra.texto,
      unidadObjetivo: palabra.texto,
      patron: 'cuaderno',
      respuesta: bien ? 'bien escrita' : `mal: ${errorTipo ?? 'sin especificar'}`,
      correcto: bien,
      errorTipo: bien ? null : errorTipo,
      latenciaMs: performance.now() - inicio.current,
      ayudas: 0,
      intentoN: 1,
    });
    if (bien) {
      aciertos.current++;
      sonidoAcierto();
    }
    alAvanzar((indice + 1) / rondas.length);
    await esperar(700);
    if (indice + 1 >= rondas.length) {
      alTerminar({ items: rondas.length, aciertosPrimera: aciertos.current });
      return;
    }
    setIndice(indice + 1);
    setFase('escribir');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${indice}-${fase === 'escribir' ? 'e' : 'c'}`}
        className="flex h-full flex-col items-center justify-center gap-8 px-6 pb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {fase === 'escribir' ? (
          <>
            <div className="flex items-center gap-6">
              <span className="flex size-36 items-center justify-center rounded-full bg-white text-mar shadow-lg">
                <IconoLapiz className="size-20" />
              </span>
              <button
                type="button"
                onClick={() => dictar(palabra.texto)}
                aria-label="Escuchar otra vez"
                className="flex size-28 items-center justify-center rounded-full bg-mar text-white shadow-lg active:scale-95"
              >
                <IconoAltavoz className="size-16" />
              </button>
            </div>
            <p className="font-sans text-3xl font-bold text-tinta/80">Escríbela en tu cuaderno</p>
            <button
              type="button"
              onClick={() => {
                setFase('comprobar');
                hablar('Mira si la has escrito igual.');
              }}
              className="min-h-24 rounded-full bg-sol px-14 font-sans text-4xl font-bold text-white shadow-[0_8px_0_0_#d9952a] active:translate-y-2"
            >
              ¡Ya!
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-8 rounded-[40px] bg-white px-10 py-6 shadow-lg">
              <Pictograma id={palabra.img} tamano={140} />
              {/* La palabra sobre pauta, para comparar con el cuaderno */}
              <span
                className="texto-lectura border-b-4 border-t-2 border-dashed border-b-tinta/30 border-t-[#c9d6e8] px-4 text-[110px] font-bold leading-[1.15] text-tinta"
              >
                {palabra.texto}
              </span>
            </div>

            {fase === 'comprobar' ? (
              <div className="flex flex-col items-center gap-3">
                <span className="font-sans text-xl text-tinta/60">Adulto: ¿la ha escrito igual?</span>
                <div className="flex gap-5">
                  <button
                    type="button"
                    onClick={() => setFase('tipo')}
                    className="flex h-20 items-center gap-3 rounded-full bg-arena px-8 font-sans text-2xl font-bold text-tinta/70"
                  >
                    <IconoMal className="size-9" /> no
                  </button>
                  <button
                    type="button"
                    onClick={() => void siguiente(true, null)}
                    className="flex h-20 items-center gap-3 rounded-full bg-mar px-8 font-sans text-2xl font-bold text-white"
                  >
                    <IconoBien className="size-9" /> sí
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex max-w-3xl flex-col items-center gap-3">
                <span className="font-sans text-xl text-tinta/60">¿Qué ha pasado? (opcional)</span>
                <div className="flex flex-wrap justify-center gap-3">
                  {TIPOS.map((t) => (
                    <button
                      key={t.tipo}
                      type="button"
                      onClick={() => void siguiente(false, t.tipo)}
                      className="min-h-16 rounded-2xl bg-white px-5 font-sans text-xl font-bold text-tinta shadow"
                    >
                      {t.etiqueta}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void siguiente(false, null)}
                    className="min-h-16 rounded-2xl bg-white/60 px-5 font-sans text-xl text-tinta/70 shadow"
                  >
                    otra cosa
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
