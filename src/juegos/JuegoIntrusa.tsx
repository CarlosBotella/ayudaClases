/**
 * LETRA INTRUSA CON PALABRA SECRETA
 * Pictograma (pato) + la palabra con una letra de más en burbujas (p l a t o).
 * Revienta la que sobra: la palabra se cierra, suena, y la letra vuela a su
 * casilla de la palabra secreta. Al completarla aparece su dibujo: ¡pegatina!
 */
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { NivelIntrusa } from '../datos/esquemas.ts';
import { esRespuestaCorrecta } from '../lib/intrusas.ts';
import { sonidoFanfarria, sonidoPop } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Destellos from '../componentes/Destellos.tsx';
import Ficha from '../componentes/Ficha.tsx';
import { IconoAltavoz } from '../componentes/Iconos.tsx';
import Pictograma from '../componentes/Pictograma.tsx';
import { ERRORES_PARA_PISTA, patronDePalabra, type PropsJuego } from './tipos.ts';
import { esperar } from './utilidades.ts';

const ESPEJO: Record<string, string> = { b: 'd', d: 'b', p: 'q', q: 'p' };

export default function JuegoIntrusa({ nivel, contenido, registrar, alTerminar, alAvanzar }: PropsJuego<NivelIntrusa>) {
  const [indice, setIndice] = useState(0);
  const [resuelto, setResuelto] = useState(false);
  const [fallos, setFallos] = useState<Record<number, number>>({});
  const [errores, setErrores] = useState(0);
  const [destellos, setDestellos] = useState(0);
  const [final, setFinal] = useState(false);
  const aciertosPrimera = useRef(0);
  const inicioItem = useRef(performance.now());

  const item = nivel.items[indice];
  const letras = item ? [...item.conIntrusa] : [];
  const pista = errores >= ERRORES_PARA_PISTA;

  // Al empezar cada ítem: la palabra suena sola (si el nivel lo pide).
  useEffect(() => {
    inicioItem.current = performance.now();
    if (item && nivel.audioAuto) {
      const t = window.setTimeout(() => hablar(item.palabra), 500);
      return () => window.clearTimeout(t);
    }
  }, [item, nivel.audioAuto]);

  if (!item) return null;

  const tocar = async (i: number) => {
    if (resuelto || final) return;
    const letra = letras[i] ?? '';
    const correcto = esRespuestaCorrecta(item.conIntrusa, i, item.palabra);
    registrar({
      item: item.palabra,
      unidadObjetivo: item.letra,
      patron: patronDePalabra(item.palabra),
      respuesta: letra,
      correcto,
      errorTipo: correcto ? null : ESPEJO[letra] === item.letra ? 'espejo' : 'intrusa',
      latenciaMs: performance.now() - inicioItem.current,
      ayudas: pista ? 1 : 0,
      intentoN: errores + 1,
    });

    if (!correcto) {
      setFallos((f) => ({ ...f, [i]: (f[i] ?? 0) + 1 }));
      setErrores((e) => e + 1);
      inicioItem.current = performance.now();
      return;
    }

    if (errores === 0) aciertosPrimera.current++;
    setResuelto(true);
    setDestellos((d) => d + 1);
    sonidoPop();
    await esperar(350);
    hablar(item.palabra);
    alAvanzar((indice + 1) / nivel.items.length);
    await esperar(1500);

    if (indice + 1 < nivel.items.length) {
      setIndice(indice + 1);
      setResuelto(false);
      setFallos({});
      setErrores(0);
      return;
    }

    // ¡Palabra secreta completa!
    setFinal(true);
    sonidoFanfarria();
    await esperar(400);
    hablar(nivel.secreta);
    await esperar(2600);
    const img = contenido.palabras[nivel.secreta]?.img;
    alTerminar({
      items: nivel.items.length,
      aciertosPrimera: aciertosPrimera.current,
      pegatina: img ? { palabra: nivel.secreta, img } : undefined,
    });
  };

  // Letras de la palabra secreta ya conseguidas (las de ítems anteriores, más la actual si está resuelta).
  const conseguidas = indice + (resuelto ? 1 : 0);

  return (
    <LayoutGroup>
      <div className="relative flex h-full flex-col items-center justify-between px-6 pb-10 pt-4">
        {/* Palabra secreta */}
        <div className="flex gap-3" aria-label="Palabra secreta">
          {[...nivel.secreta].map((l, i) => (
            <div key={i} className="flex size-20 items-center justify-center rounded-2xl border-4 border-dashed border-sol/70 bg-white/60">
              {i < conseguidas && (
                <motion.span layoutId={`secreta-${i}`} className="texto-lectura text-[56px] font-bold text-sol">
                  {l}
                </motion.span>
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {final ? (
            <motion.div
              key="final"
              className="relative flex flex-col items-center gap-4"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            >
              <Destellos disparo={1} radio={220} />
              <div className="rounded-[40px] bg-white p-6 shadow-xl ring-8 ring-sol">
                <Pictograma id={contenido.palabras[nivel.secreta]?.img} tamano={260} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={indice}
              className="flex flex-col items-center gap-6"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
            >
              <div className="flex items-center gap-6">
                <div className="rounded-[32px] bg-white p-4 shadow-md">
                  <Pictograma id={contenido.palabras[item.palabra]?.img} tamano={210} />
                </div>
                {nivel.audioAuto && (
                  <button
                    type="button"
                    onClick={() => hablar(item.palabra)}
                    aria-label="Escuchar la palabra"
                    className="flex size-20 items-center justify-center rounded-full bg-mar text-white shadow-md active:scale-95"
                  >
                    <IconoAltavoz className="size-11" />
                  </button>
                )}
              </div>

              {/* Letras en burbujas; al resolver, la intrusa se va y la palabra se cierra */}
              <div className="relative flex items-center gap-3">
                <Destellos disparo={destellos} />
                {letras.map((l, i) => {
                  const esIntrusa = i === item.posicion;
                  if (resuelto && esIntrusa) return null;
                  return (
                    <motion.div key={`${indice}-${i}`} layout layoutId={esIntrusa ? `secreta-${indice}` : undefined}>
                      <Ficha
                        onClick={() => void tocar(i)}
                        fallos={fallos[i] ?? 0}
                        pista={pista && esIntrusa && !resuelto}
                        desactivada={resuelto}
                        etiqueta={`letra ${l}`}
                        className={`flex size-24 items-center justify-center shadow-md ${
                          resuelto ? 'rounded-xl' : 'rounded-full'
                        }`}
                        colorNormal={resuelto ? 'bg-transparent shadow-none' : 'bg-white'}
                      >
                        <span className="texto-lectura text-[64px] font-bold leading-none text-tinta">{l}</span>
                      </Ficha>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div />
      </div>
    </LayoutGroup>
  );
}
