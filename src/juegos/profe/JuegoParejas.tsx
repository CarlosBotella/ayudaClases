/**
 * PAREJAS POR TURNOS (con el profe)
 * Memory de palabra ↔ dibujo. Niña y profe juegan por turnos: cada uno
 * levanta dos cartas. Si es pareja, quien la encuentra lee la palabra en voz
 * alta y repite turno; cuando lee la niña, el profe marca si lo ha hecho bien.
 * Si no es pareja, las cartas se vuelven a tapar y pasa el turno.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { crearAleatorio } from '../../lib/aleatorio.ts';
import { sonidoAcierto, sonidoFanfarria } from '../../lib/sonidos.ts';
import { hablar } from '../../lib/voz.ts';
import Pictograma from '../../componentes/Pictograma.tsx';
import { IconoBien, IconoMal } from '../../componentes/Iconos.tsx';
import { esperar, patronDePalabra } from '../utilidades.ts';
import { generarParejas, type CartaPareja } from './generar.ts';
import { parametrosProfe } from '../ajustar.ts';
import type { PropsJuegoProfe } from './tipos.ts';

type Jugador = 'nina' | 'profe';

export default function JuegoParejas({ palabras, escalon, registrar, alTerminar, alAvanzar }: PropsJuegoProfe) {
  const cartas = useMemo(
    () => generarParejas(palabras, crearAleatorio(Date.now()), parametrosProfe(escalon).parejas),
    [palabras, escalon],
  );
  // Columnas según cuántas cartas haya (de 8 a 16), para que quepan en la tablet.
  const columnas = ({ 8: 4, 10: 5, 12: 4, 14: 5, 16: 4 } as Record<number, number>)[cartas.length] ?? 4;
  const totalParejas = cartas.length / 2;
  const [turno, setTurno] = useState<Jugador>('nina');
  const [abiertas, setAbiertas] = useState<string[]>([]);
  const [duenas, setDuenas] = useState<Record<string, Jugador>>({}); // palabra → quién la ganó
  const [validando, setValidando] = useState<string | null>(null); // palabra que lee la niña
  const [final, setFinal] = useState(false);
  const lecturas = useRef({ total: 0, bien: 0 });
  const inicio = useRef(performance.now());
  const ocupado = useRef(false);

  const puntos = (j: Jugador) => Object.values(duenas).filter((d) => d === j).length;

  const ganarPareja = async (nuevasDuenas: Record<string, Jugador>) => {
    setDuenas(nuevasDuenas);
    setAbiertas([]);
    const ganadas = Object.keys(nuevasDuenas).length;
    alAvanzar(ganadas / totalParejas);
    ocupado.current = false;
    if (ganadas < totalParejas) return;

    setFinal(true);
    sonidoFanfarria();
    await esperar(3000);
    alTerminar({ items: lecturas.current.total, aciertosPrimera: lecturas.current.bien });
  };

  const levantar = async (c: CartaPareja) => {
    if (ocupado.current || validando || duenas[c.palabra] || abiertas.includes(c.id) || abiertas.length >= 2) return;
    const nuevas = [...abiertas, c.id];
    setAbiertas(nuevas);
    if (nuevas.length < 2) return;

    ocupado.current = true;
    const [a, b] = nuevas.map((id) => cartas.find((x) => x.id === id));
    if (a && b && a.palabra === b.palabra) {
      sonidoAcierto();
      await esperar(700);
      if (turno === 'nina') {
        // Ella lee la palabra; el profe valida.
        inicio.current = performance.now();
        setValidando(a.palabra);
        return;
      }
      await ganarPareja({ ...duenas, [a.palabra]: 'profe' });
      return;
    }
    // No es pareja: se tapan y pasa el turno.
    await esperar(1400);
    setAbiertas([]);
    setTurno((t) => (t === 'nina' ? 'profe' : 'nina'));
    ocupado.current = false;
  };

  const validar = async (bien: boolean) => {
    if (!validando) return;
    const palabra = validando;
    lecturas.current.total++;
    if (bien) lecturas.current.bien++;
    registrar({
      item: palabra,
      unidadObjetivo: palabra,
      patron: patronDePalabra(palabra),
      respuesta: bien ? 'leída' : 'error',
      correcto: bien,
      errorTipo: null,
      latenciaMs: performance.now() - inicio.current,
      ayudas: 0,
      intentoN: 1,
    });
    setValidando(null);
    // Siempre se queda la pareja (sin castigo); si no la leyó bien, la tablet le da el modelo.
    if (!bien) hablar(palabra);
    await ganarPareja({ ...duenas, [palabra]: 'nina' });
  };

  const Marcador = ({ jugador, etiqueta, color }: { jugador: Jugador; etiqueta: string; color: string }) => (
    <motion.div
      animate={{ scale: turno === jugador && !final ? 1.08 : 1 }}
      className={`flex items-center gap-3 rounded-full px-6 py-2 font-sans text-2xl font-bold text-white shadow ${color} ${
        turno === jugador && !final ? 'ring-4 ring-white' : 'opacity-60'
      }`}
    >
      {etiqueta} <span className="rounded-full bg-white/30 px-3">{puntos(jugador)}</span>
    </motion.div>
  );

  return (
    <div className="relative flex h-full flex-col items-center gap-3 px-4 pb-4">
      <div className="flex items-center gap-6">
        <Marcador jugador="nina" etiqueta="Tú" color="bg-sol" />
        <Marcador jugador="profe" etiqueta="Profe" color="bg-mar" />
      </div>

      <div className="grid flex-1 content-center gap-3" style={{ gridTemplateColumns: `repeat(${columnas}, auto)` }}>
        {cartas.map((c) => {
          const visible = abiertas.includes(c.id) || duenas[c.palabra] !== undefined;
          const duena = duenas[c.palabra];
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => void levantar(c)}
              animate={{ rotateY: visible ? 0 : 180 }}
              transition={{ duration: 0.35 }}
              aria-label={visible ? (c.cara === 'palabra' ? c.palabra : `dibujo de ${c.palabra}`) : 'carta tapada'}
              className={`flex h-28 w-40 items-center justify-center rounded-2xl shadow-md ${
                visible ? 'bg-white' : 'bg-gradient-to-br from-mar to-mar-oscuro'
              } ${duena === 'nina' ? 'ring-4 ring-sol' : duena === 'profe' ? 'ring-4 ring-mar' : ''}`}
            >
              {visible ? (
                c.cara === 'palabra' ? (
                  <span className="texto-lectura text-[44px] font-bold text-tinta">{c.palabra}</span>
                ) : (
                  <Pictograma id={c.img} tamano={88} />
                )
              ) : (
                <span className="font-sans text-5xl font-bold text-white/70">?</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* El profe valida la lectura de la niña */}
      <AnimatePresence>
        {validando && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-4 rounded-3xl bg-white px-6 py-3 shadow-xl"
          >
            <span className="texto-lectura text-[56px] font-bold text-tinta">{validando}</span>
            <span className="font-sans text-lg text-tinta/60">Profe, ¿la ha leído bien?</span>
            <button
              type="button"
              onClick={() => void validar(false)}
              className="flex h-16 items-center gap-2 rounded-full bg-arena px-5 font-sans text-lg font-bold text-tinta/70"
            >
              <IconoMal className="size-7" /> mal
            </button>
            <button
              type="button"
              onClick={() => void validar(true)}
              className="flex h-16 items-center gap-2 rounded-full bg-mar px-5 font-sans text-lg font-bold text-white"
            >
              <IconoBien className="size-7" /> bien
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {final && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 m-auto flex h-fit w-fit flex-col items-center gap-3 rounded-[40px] bg-white px-14 py-8 shadow-2xl"
          >
            <span className="font-sans text-5xl font-bold text-sol">Tú {puntos('nina')}</span>
            <span className="font-sans text-3xl font-bold text-mar">Profe {puntos('profe')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
