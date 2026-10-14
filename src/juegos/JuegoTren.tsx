/**
 * TREN DE SÍLABAS
 * Pictograma (bruja), locomotora con un vagón vacío por sílaba y piezas abajo
 * (bru, ja y la trampa bur). Se arrastra cada sílaba a su vagón — o se toca
 * la pieza y luego el vagón —. Si encaja: "clac" y se lee; si no, vuelve con
 * un rebote. Con el tren completo se lee la palabra y el tren se va.
 * Variante de frase: los vagones son palabras y solo hay un hueco.
 */
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ItemTren, NivelTren, TipoErrorDatos } from '../datos/esquemas.ts';
import { sonidoAcierto, sonidoClac } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Destellos from '../componentes/Destellos.tsx';
import EscenaVista from '../componentes/EscenaVista.tsx';
import Ficha from '../componentes/Ficha.tsx';
import { ERRORES_PARA_PISTA, type PropsJuego } from './tipos.ts';
import { barajar, esperar, patronDePalabra } from './utilidades.ts';

interface Pieza {
  id: string;
  texto: string;
  /** Si es la trampa, su tipo de error. */
  trampa: TipoErrorDatos | null;
}

function piezasDe(item: ItemTren): Pieza[] {
  const buenas = item.huecos.map((h, i) => ({ id: `b${i}`, texto: item.piezas[h] ?? '', trampa: null }));
  const malas = item.trampas.map((t, i) => ({ id: `t${i}`, texto: t.texto, trampa: t.tipo }));
  return barajar([...buenas, ...malas]);
}

// ─── Piezas arrastrables y vagones ─────────────────────────────────────────

function PiezaArrastrable({ pieza, children }: { pieza: Pieza; children: ReactNode }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({ id: pieza.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        // Al soltar en mal sitio vuelve con un rebote.
        transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(.34,1.56,.64,1)',
        zIndex: isDragging ? 40 : undefined,
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
}

function Vagon({
  indice,
  texto,
  fijo,
  pista,
  unidad,
  onTocar,
}: {
  indice: number;
  texto: string | null;
  fijo: boolean;
  pista: boolean;
  unidad: 'silaba' | 'palabra';
  onTocar: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `vagon-${indice}` });
  return (
    <motion.button
      type="button"
      ref={setNodeRef}
      onClick={onTocar}
      animate={pista ? { scale: [1, 1.07, 1] } : { scale: 1 }}
      transition={pista ? { repeat: Infinity, duration: 0.9 } : {}}
      className={`relative flex h-32 items-center justify-center rounded-2xl border-4 ${
        unidad === 'palabra' ? 'min-w-44 px-4' : 'w-40'
      } ${texto ? 'border-mar bg-white' : 'border-dashed border-mar/50 bg-white/50'} ${
        isOver ? 'scale-105 bg-sol/30' : ''
      } ${fijo ? 'opacity-90' : ''}`}
    >
      {texto && (
        <motion.span
          initial={fijo ? false : { scale: 1.6 }}
          animate={{ scale: 1 }}
          className="texto-lectura text-[52px] font-bold text-tinta"
        >
          {texto}
        </motion.span>
      )}
      {/* Ruedas */}
      <span className="absolute -bottom-5 left-5 size-9 rounded-full border-4 border-tinta/70 bg-arena" />
      <span className="absolute -bottom-5 right-5 size-9 rounded-full border-4 border-tinta/70 bg-arena" />
    </motion.button>
  );
}

function Locomotora() {
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" aria-hidden="true">
      <rect x="10" y="40" width="80" height="55" rx="10" fill="#2f8f83" />
      <rect x="55" y="15" width="40" height="45" rx="8" fill="#1f6a61" />
      <rect x="63" y="23" width="24" height="20" rx="4" fill="#fff8ec" />
      <rect x="18" y="22" width="16" height="22" rx="3" fill="#2d3436" />
      <rect x="88" y="70" width="20" height="10" rx="3" fill="#2d3436" />
      <circle cx="30" cy="100" r="13" fill="#f3e6cc" stroke="#2d3436" strokeWidth="5" />
      <circle cx="72" cy="100" r="13" fill="#f3e6cc" stroke="#2d3436" strokeWidth="5" />
      <circle cx="26" cy="12" r="7" fill="#dfe6e9" />
      <circle cx="16" cy="4" r="5" fill="#dfe6e9" />
    </svg>
  );
}

// ─── Juego ──────────────────────────────────────────────────────────────────

export default function JuegoTren({ nivel, contenido, registrar, alTerminar, alAvanzar }: PropsJuego<NivelTren>) {
  const [indice, setIndice] = useState(0);
  const item = nivel.items[indice];
  const piezas = useMemo(() => (item ? piezasDe(item) : []), [item]);

  const [llenos, setLlenos] = useState<Record<number, string>>({});
  const [usadas, setUsadas] = useState<Set<string>>(new Set());
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [fallos, setFallos] = useState<Record<string, number>>({});
  const [errores, setErrores] = useState(0);
  const [destellos, setDestellos] = useState(0);
  const [saliendo, setSaliendo] = useState(false);
  const tren = useAnimationControls();
  const aciertosPrimera = useRef(0);
  const inicio = useRef(performance.now());

  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // El tren entra por la derecha al empezar cada ítem.
  useEffect(() => {
    inicio.current = performance.now();
    void tren.start({ x: [900, 0], transition: { type: 'spring', stiffness: 60, damping: 14 } });
  }, [indice, tren]);

  if (!item) return null;

  const huecosPendientes = item.huecos.filter((h) => llenos[h] === undefined);
  const pista = errores >= ERRORES_PARA_PISTA;
  const huecoPista = huecosPendientes[0];

  const textoVagon = (i: number): string | null =>
    item.huecos.includes(i) ? (llenos[i] ?? null) : (item.piezas[i] ?? null);

  const intentar = async (piezaId: string, vagon: number) => {
    if (saliendo) return;
    const pieza = piezas.find((p) => p.id === piezaId);
    if (!pieza || usadas.has(piezaId) || !item.huecos.includes(vagon) || llenos[vagon] !== undefined) return;
    setSeleccionada(null);

    const objetivo = item.piezas[vagon] ?? '';
    const correcto = pieza.texto === objetivo;
    // Si es una pieza buena puesta en otro vagón, es un error de orden (inversión).
    const errorTipo: TipoErrorDatos | null = correcto ? null : (pieza.trampa ?? 'inversion');
    registrar({
      item: item.lectura,
      unidadObjetivo: objetivo,
      patron: item.unidad === 'silaba' ? patronDePalabra(objetivo) : 'palabra',
      respuesta: pieza.texto,
      correcto,
      errorTipo,
      latenciaMs: performance.now() - inicio.current,
      ayudas: pista ? 1 : 0,
      intentoN: errores + 1,
    });
    inicio.current = performance.now();

    if (!correcto) {
      setFallos((f) => ({ ...f, [piezaId]: (f[piezaId] ?? 0) + 1 }));
      setErrores((e) => e + 1);
      return;
    }

    sonidoClac();
    hablar(pieza.texto);
    const nuevosLlenos = { ...llenos, [vagon]: pieza.texto };
    setLlenos(nuevosLlenos);
    setUsadas(new Set(usadas).add(piezaId));

    if (item.huecos.every((h) => nuevosLlenos[h] !== undefined)) {
      // ¡Tren completo!
      if (errores === 0) aciertosPrimera.current++;
      setSaliendo(true);
      setDestellos((d) => d + 1);
      sonidoAcierto();
      await esperar(600);
      hablar(item.lectura);
      alAvanzar((indice + 1) / nivel.items.length);
      await esperar(1300);
      await tren.start({ x: -1400, transition: { duration: 1.1, ease: 'easeIn' } });

      if (indice + 1 >= nivel.items.length) {
        alTerminar({ items: nivel.items.length, aciertosPrimera: aciertosPrimera.current });
        return;
      }
      setLlenos({});
      setUsadas(new Set());
      setFallos({});
      setErrores(0);
      setSaliendo(false);
      setIndice(indice + 1);
    }
  };

  const alSoltar = (e: DragEndEvent) => {
    const destino = e.over?.id;
    if (typeof destino === 'string' && destino.startsWith('vagon-')) {
      void intentar(String(e.active.id), Number(destino.slice(6)));
    }
  };

  const piezaPista = pista && huecoPista !== undefined
    ? piezas.find((p) => !usadas.has(p.id) && p.texto === item.piezas[huecoPista])?.id
    : undefined;

  return (
    <DndContext sensors={sensores} onDragEnd={alSoltar}>
      <div className="flex h-full flex-col items-center justify-between overflow-hidden px-4 pb-6 pt-2">
        <div className="relative rounded-[32px] bg-white p-3 shadow-md">
          <Destellos disparo={destellos} radio={160} />
          <EscenaVista escena={item.escena} imagenes={contenido.palabras} base={item.unidad === 'palabra' ? 100 : 130} />
        </div>

        {/* El tren */}
        <motion.div animate={tren} className="flex items-end gap-3">
          <Locomotora />
          {item.piezas.map((_, i) => (
            <Vagon
              key={i}
              indice={i}
              texto={textoVagon(i)}
              fijo={!item.huecos.includes(i)}
              pista={pista && i === huecoPista}
              unidad={item.unidad}
              onTocar={() => {
                if (seleccionada) void intentar(seleccionada, i);
              }}
            />
          ))}
        </motion.div>
        <div className="-mt-4 h-3 w-full max-w-5xl rounded-full bg-tinta/20" aria-hidden="true" />

        {/* Piezas */}
        <div className="flex min-h-32 flex-wrap items-center justify-center gap-5">
          {piezas.map((p) =>
            usadas.has(p.id) ? (
              <div key={p.id} className={item.unidad === 'palabra' ? 'h-28 w-44' : 'h-28 w-36'} />
            ) : (
              <PiezaArrastrable key={p.id} pieza={p}>
                <Ficha
                  onClick={() => setSeleccionada(seleccionada === p.id ? null : p.id)}
                  fallos={fallos[p.id] ?? 0}
                  pista={p.id === piezaPista}
                  seleccionada={seleccionada === p.id}
                  etiqueta={p.texto}
                  className={`flex h-28 items-center justify-center rounded-2xl px-6 shadow-lg ${
                    item.unidad === 'palabra' ? 'min-w-44' : 'min-w-36'
                  }`}
                >
                  <span className="texto-lectura text-[52px] font-bold text-tinta">{p.texto}</span>
                </Ficha>
              </PiezaArrastrable>
            ),
          )}
        </div>
      </div>
    </DndContext>
  );
}
