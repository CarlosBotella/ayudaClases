/**
 * DICTADO MÁGICO (con el profe)
 * El profe dicta una palabra (o toca el altavoz) y la niña la escribe tocando
 * fichas de letras en orden. Hay fichas trampa (espejo, sonido parecido).
 * Al terminar aparece el dibujo de la palabra como premio.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import type { TipoErrorDatos } from '../../datos/esquemas.ts';
import { crearAleatorio } from '../../lib/aleatorio.ts';
import { sonidoAcierto, sonidoClac } from '../../lib/sonidos.ts';
import { hablar } from '../../lib/voz.ts';
import Destellos from '../../componentes/Destellos.tsx';
import Ficha from '../../componentes/Ficha.tsx';
import { IconoAltavoz } from '../../componentes/Iconos.tsx';
import Pictograma from '../../componentes/Pictograma.tsx';
import { ERRORES_PARA_PISTA } from '../tipos.ts';
import { barajar, esperar } from '../utilidades.ts';
import { generarDictado, type RondaDictado } from './generar.ts';
import { parametrosProfe } from '../ajustar.ts';
import RecuadroProfe from './RecuadroProfe.tsx';
import type { PropsJuegoProfe } from './tipos.ts';

interface FichaLetra {
  id: string;
  texto: string;
  trampa: TipoErrorDatos | null;
}

const fichasDe = (r: RondaDictado): FichaLetra[] =>
  barajar([
    ...r.grafemas.map((g, i) => ({ id: `g${i}`, texto: g, trampa: null })),
    ...r.trampas.map((t, i) => ({ id: `t${i}`, texto: t.texto, trampa: t.tipo })),
  ]);

export default function JuegoDictado({ mundo, palabras, escalon, registrar, alTerminar, alAvanzar }: PropsJuegoProfe) {
  const rondas = useMemo(() => {
    const p = parametrosProfe(escalon);
    return generarDictado(palabras, mundo, crearAleatorio(Date.now()), 5, p.maxGrafemas, p.trampasDictado);
  }, [palabras, mundo, escalon]);
  const [indice, setIndice] = useState(0);
  const ronda = rondas[indice];
  const fichas = useMemo(() => (ronda ? fichasDe(ronda) : []), [ronda]);
  const [colocadas, setColocadas] = useState<string[]>([]);
  const [usadas, setUsadas] = useState<Set<string>>(new Set());
  const [fallos, setFallos] = useState<Record<string, number>>({});
  const [errores, setErrores] = useState(0);
  const [completa, setCompleta] = useState(false);
  const aciertosPrimera = useRef(0);
  const inicio = useRef(performance.now());

  if (!ronda) return null;
  const posicion = colocadas.length;
  const esperada = ronda.grafemas[posicion];
  const pista = errores >= ERRORES_PARA_PISTA;
  const fichaPista = pista ? fichas.find((f) => !usadas.has(f.id) && f.texto === esperada)?.id : undefined;
  const img = palabras.find((p) => p.texto === ronda.palabra)?.img;

  const tocar = async (f: FichaLetra) => {
    if (completa || usadas.has(f.id)) return;
    const correcto = f.texto === esperada;
    registrar({
      item: ronda.palabra,
      unidadObjetivo: esperada ?? '',
      patron: 'grafema',
      respuesta: f.texto,
      correcto,
      // Letra de la palabra pero fuera de su sitio = error de orden (inversión).
      errorTipo: correcto ? null : (f.trampa ?? (ronda.grafemas.includes(f.texto) ? 'inversion' : 'sustitucion')),
      latenciaMs: performance.now() - inicio.current,
      ayudas: pista ? 1 : 0,
      intentoN: errores + 1,
    });
    inicio.current = performance.now();

    if (!correcto) {
      setFallos((x) => ({ ...x, [f.id]: (x[f.id] ?? 0) + 1 }));
      setErrores((e) => e + 1);
      return;
    }

    sonidoClac();
    const nuevas = [...colocadas, f.texto];
    setColocadas(nuevas);
    setUsadas(new Set(usadas).add(f.id));
    if (nuevas.length < ronda.grafemas.length) return;

    // ¡Palabra escrita!
    if (errores === 0) aciertosPrimera.current++;
    setCompleta(true);
    sonidoAcierto();
    await esperar(400);
    hablar(ronda.palabra);
    alAvanzar((indice + 1) / rondas.length);
    await esperar(2000);

    if (indice + 1 >= rondas.length) {
      alTerminar({ items: rondas.length, aciertosPrimera: aciertosPrimera.current });
      return;
    }
    setIndice(indice + 1);
    setColocadas([]);
    setUsadas(new Set());
    setFallos({});
    setErrores(0);
    setCompleta(false);
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-between px-6 pb-8 pt-2">
      <div className="flex w-full items-start justify-end gap-4">
        <button
          type="button"
          onClick={() => hablar(ronda.palabra)}
          aria-label="Escuchar la palabra"
          className="flex size-20 items-center justify-center rounded-full bg-mar text-white shadow-md active:scale-95"
        >
          <IconoAltavoz className="size-11" />
        </button>
        <RecuadroProfe titulo="Profe, dicta:" texto={ronda.palabra} />
      </div>

      {/* Huecos de la palabra */}
      <div className="relative flex items-center gap-3">
        <Destellos disparo={completa ? 1 : 0} radio={220} />
        <AnimatePresence>
          {completa && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mr-4 rounded-3xl bg-white p-2 shadow-md">
              <Pictograma id={img} tamano={130} />
            </motion.div>
          )}
        </AnimatePresence>
        {ronda.grafemas.map((_, i) => (
          <div
            key={`${indice}-${i}`}
            className={`flex h-28 min-w-24 items-center justify-center rounded-2xl border-4 px-2 ${
              i < colocadas.length ? 'border-mar bg-white' : i === posicion ? 'border-sol bg-white/70' : 'border-dashed border-mar/40 bg-white/40'
            }`}
          >
            {colocadas[i] && (
              <motion.span initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="texto-lectura text-[64px] font-bold text-tinta">
                {colocadas[i]}
              </motion.span>
            )}
          </div>
        ))}
      </div>

      {/* Fichas de letras */}
      <div className="flex max-w-4xl flex-wrap justify-center gap-4">
        {fichas.map((f) =>
          usadas.has(f.id) ? (
            <div key={f.id} className="size-24" />
          ) : (
            <Ficha
              key={f.id}
              onClick={() => void tocar(f)}
              fallos={fallos[f.id] ?? 0}
              pista={f.id === fichaPista}
              desactivada={completa}
              etiqueta={`letra ${f.texto}`}
              className="flex size-24 items-center justify-center rounded-2xl shadow-lg"
            >
              <span className="texto-lectura text-[60px] font-bold text-tinta">{f.texto}</span>
            </Ficha>
          ),
        )}
      </div>
    </div>
  );
}
