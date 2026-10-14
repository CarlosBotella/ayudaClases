/**
 * DETECTIVE DE DIBUJOS
 * Lee una frase corta y elige, entre 2 o 3 escenas de pictogramas, la que
 * dice la frase. Aquí no hay audio automático: es comprensión lectora.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { NivelDetective } from '../datos/esquemas.ts';
import { sonidoAcierto } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Destellos from '../componentes/Destellos.tsx';
import EscenaVista from '../componentes/EscenaVista.tsx';
import Ficha from '../componentes/Ficha.tsx';
import { ERRORES_PARA_PISTA, type PropsJuego } from './tipos.ts';
import { esperar } from './utilidades.ts';

export default function JuegoDetective({ nivel, contenido, registrar, alTerminar, alAvanzar }: PropsJuego<NivelDetective>) {
  const [indice, setIndice] = useState(0);
  const [fallos, setFallos] = useState<Record<number, number>>({});
  const [errores, setErrores] = useState(0);
  const [resuelta, setResuelta] = useState<number | null>(null);
  const aciertosPrimera = useRef(0);
  const inicio = useRef(performance.now());

  const item = nivel.items[indice];
  useEffect(() => {
    inicio.current = performance.now();
  }, [indice]);

  if (!item) return null;
  const pista = errores >= ERRORES_PARA_PISTA;

  const elegir = async (i: number) => {
    if (resuelta !== null) return;
    const correcto = i === item.correcta;
    registrar({
      item: item.frase,
      unidadObjetivo: item.frase,
      patron: 'frase',
      respuesta: item.escenas[i]?.elementos.map((e) => `${e.copias}×${e.palabra}@${e.escala}`).join('+') ?? '',
      correcto,
      errorTipo: correcto ? null : 'comprension',
      latenciaMs: performance.now() - inicio.current,
      ayudas: pista ? 1 : 0,
      intentoN: errores + 1,
    });
    inicio.current = performance.now();

    if (!correcto) {
      setFallos((f) => ({ ...f, [i]: (f[i] ?? 0) + 1 }));
      setErrores((e) => e + 1);
      return;
    }

    if (errores === 0) aciertosPrimera.current++;
    setResuelta(i);
    sonidoAcierto();
    hablar(item.frase);
    alAvanzar((indice + 1) / nivel.items.length);
    await esperar(1800);

    if (indice + 1 >= nivel.items.length) {
      alTerminar({ items: nivel.items.length, aciertosPrimera: aciertosPrimera.current });
      return;
    }
    setIndice(indice + 1);
    setFallos({});
    setErrores(0);
    setResuelta(null);
  };

  const base = item.escenas.length === 3 ? 95 : 120;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={indice}
        className="flex h-full flex-col items-center justify-center gap-10 px-6 pb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
      >
        <div className="rounded-3xl bg-white px-10 py-4 shadow-md">
          <p className="texto-lectura text-center text-[60px] font-bold text-tinta">{item.frase}</p>
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-6">
          {item.escenas.map((escena, i) => (
            <div key={i} className="relative">
              {resuelta === i && <Destellos disparo={1} radio={180} />}
              <Ficha
                onClick={() => void elegir(i)}
                fallos={fallos[i] ?? 0}
                pista={pista && i === item.correcta && resuelta === null}
                desactivada={resuelta !== null}
                etiqueta={`dibujo ${i + 1}`}
                className={`flex items-center justify-center rounded-[32px] p-4 shadow-lg ${
                  resuelta === i ? 'ring-8 ring-sol' : ''
                }`}
              >
                <EscenaVista escena={escena} imagenes={contenido.palabras} base={base} />
              </Ficha>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
