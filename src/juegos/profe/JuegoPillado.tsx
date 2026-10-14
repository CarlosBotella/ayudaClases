/**
 * ¡PILLADO! (con el profe)
 * La palabra está escrita en grande. El profe la lee en voz alta, a veces bien
 * y a veces con un error típico (bal por bla, pato por plato…). La niña decide:
 * pulgar = "está bien" · lupa = "¡te he pillado!".
 * Entrena la atención a cada letra (lo que más cuesta en la lectura lenta).
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { crearAleatorio } from '../../lib/aleatorio.ts';
import { sonidoAcierto } from '../../lib/sonidos.ts';
import { hablar } from '../../lib/voz.ts';
import Destellos from '../../componentes/Destellos.tsx';
import Ficha from '../../componentes/Ficha.tsx';
import { IconoPillado, IconoPulgar } from '../../componentes/Iconos.tsx';
import Pictograma from '../../componentes/Pictograma.tsx';
import { ERRORES_PARA_PISTA } from '../tipos.ts';
import { esperar, patronDePalabra } from '../utilidades.ts';
import { generarPillado } from './generar.ts';
import { parametrosProfe } from '../ajustar.ts';
import RecuadroProfe from './RecuadroProfe.tsx';
import type { PropsJuegoProfe } from './tipos.ts';

type Respuesta = 'bien' | 'pillado';

export default function JuegoPillado({ palabras, escalon, registrar, alTerminar, alAvanzar }: PropsJuegoProfe) {
  const rondas = useMemo(
    () => generarPillado(palabras, crearAleatorio(Date.now()), 8, parametrosProfe(escalon).erroresPillado),
    [palabras, escalon],
  );
  const [indice, setIndice] = useState(0);
  const [fallos, setFallos] = useState<Record<Respuesta, number>>({ bien: 0, pillado: 0 });
  const [errores, setErrores] = useState(0);
  const [resuelta, setResuelta] = useState(false);
  const aciertosPrimera = useRef(0);
  const inicio = useRef(performance.now());

  const ronda = rondas[indice];
  if (!ronda) return null;
  const correcta: Respuesta = ronda.esError ? 'pillado' : 'bien';
  const pista = errores >= ERRORES_PARA_PISTA;
  const img = palabras.find((p) => p.texto === ronda.palabra)?.img;

  const responder = async (r: Respuesta) => {
    if (resuelta) return;
    const correcto = r === correcta;
    registrar({
      item: ronda.palabra,
      unidadObjetivo: ronda.palabra,
      patron: patronDePalabra(ronda.palabra),
      respuesta: r === 'pillado' ? `pillado (oyó «${ronda.leer}»)` : `bien (oyó «${ronda.leer}»)`,
      correcto,
      // Si no detecta el error del profe, se apunta el tipo de error que no vio.
      errorTipo: correcto ? null : ronda.esError ? ronda.tipo : null,
      latenciaMs: performance.now() - inicio.current,
      ayudas: pista ? 1 : 0,
      intentoN: errores + 1,
    });
    inicio.current = performance.now();

    if (!correcto) {
      setFallos((f) => ({ ...f, [r]: f[r] + 1 }));
      setErrores((e) => e + 1);
      return;
    }

    if (errores === 0) aciertosPrimera.current++;
    setResuelta(true);
    sonidoAcierto();
    // Modelo: la tablet lee la palabra BIEN.
    await esperar(500);
    hablar(ronda.palabra);
    alAvanzar((indice + 1) / rondas.length);
    await esperar(1600);

    if (indice + 1 >= rondas.length) {
      alTerminar({ items: rondas.length, aciertosPrimera: aciertosPrimera.current });
      return;
    }
    setIndice(indice + 1);
    setFallos({ bien: 0, pillado: 0 });
    setErrores(0);
    setResuelta(false);
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8 px-6 pb-6">
      <div className="absolute right-6 top-2">
        <RecuadroProfe titulo={ronda.esError ? 'Profe, lee (con error):' : 'Profe, lee bien:'} texto={ronda.leer} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={indice}
          className="relative flex items-center gap-8"
          initial={{ opacity: 0, x: 120 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -120 }}
        >
          <Destellos disparo={resuelta ? 1 : 0} radio={200} />
          <div className="rounded-[32px] bg-white p-3 shadow-md">
            <Pictograma id={img} tamano={170} />
          </div>
          <span className="texto-lectura text-[96px] font-bold text-tinta">{ronda.palabra}</span>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-12">
        <Ficha
          onClick={() => void responder('bien')}
          fallos={fallos.bien}
          pista={pista && correcta === 'bien' && !resuelta}
          desactivada={resuelta}
          etiqueta="Lo ha leído bien"
          colorNormal="bg-mar"
          className="flex size-36 flex-col items-center justify-center rounded-full text-white shadow-lg"
        >
          <IconoPulgar className="size-20" />
        </Ficha>
        <Ficha
          onClick={() => void responder('pillado')}
          fallos={fallos.pillado}
          pista={pista && correcta === 'pillado' && !resuelta}
          desactivada={resuelta}
          etiqueta="¡Te he pillado!"
          colorNormal="bg-sol"
          className="flex size-36 flex-col items-center justify-center rounded-full text-white shadow-lg"
        >
          <IconoPillado className="size-20" />
        </Ficha>
      </div>
    </div>
  );
}
