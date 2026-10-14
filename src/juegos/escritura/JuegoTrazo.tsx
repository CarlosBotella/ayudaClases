/**
 * TRAZA LA LETRA
 * Letra grande sobre una pauta. Se repasa trazo a trazo, empezando en el punto
 * verde y siguiendo la flecha. La app comprueba la forma y la dirección.
 * Según el escalón de reto, el modelo se va borrando hasta escribir sin ayuda.
 * NO se guarda el dibujo: solo si cada trazo salió bien y cuánto tardó.
 */
import { motion } from 'framer-motion';
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { crearAleatorio } from '../../lib/aleatorio.ts';
import { permitidosEnMundo } from '../../lib/clasificador.ts';
import { sonidoAcierto, sonidoClac } from '../../lib/sonidos.ts';
import { anchoLetra, evaluarTrazo, LETRAS, PAUTA, toleranciaDe, type Punto } from '../../lib/trazos.ts';
import { hablar } from '../../lib/voz.ts';
import Destellos from '../../componentes/Destellos.tsx';
import Pictograma from '../../componentes/Pictograma.tsx';
import { DURACION_ERROR_MS } from '../../componentes/Ficha.tsx';
import { ERRORES_PARA_PISTA } from '../tipos.ts';
import { esperar } from '../utilidades.ts';
import type { PropsJuegoProfe } from '../profe/tipos.ts';

const RONDAS = 6;

/** Letras a trazar: primero las que estrena el mundo, luego repaso de anteriores. */
export function letrasParaTrazar(mundo: number, semilla: number): string[] {
  const rnd = crearAleatorio(semilla);
  const disponibles = (m: number) => [...permitidosEnMundo(m).grafemas].filter((g) => g.length === 1 && LETRAS[g]);
  const anteriores = new Set(mundo > 1 ? disponibles(mundo - 1) : []);
  const nuevas = disponibles(mundo).filter((l) => !anteriores.has(l));
  // Mundos 4 y 5 no estrenan letras: se repasan todas.
  const base = nuevas.length > 0 ? nuevas : disponibles(mundo);
  const repaso = rnd.barajar([...anteriores]);
  return [...rnd.barajar(base), ...repaso].slice(0, RONDAS);
}

export default function JuegoTrazo({ mundo, palabras, escalon, registrar, alTerminar, alAvanzar }: PropsJuegoProfe) {
  const letras = useMemo(() => letrasParaTrazar(mundo, Date.now()), [mundo]);
  const [indice, setIndice] = useState(0);
  const [trazoActual, setTrazoActual] = useState(0);
  const [hechos, setHechos] = useState<Punto[][]>([]);
  const [dibujo, setDibujo] = useState<Punto[]>([]);
  const [naranja, setNaranja] = useState(false);
  const [errores, setErrores] = useState(0);
  const [completa, setCompleta] = useState(false);
  const lienzo = useRef<SVGSVGElement>(null);
  const dibujando = useRef(false);
  const aciertosPrimera = useRef(0);
  const inicio = useRef(performance.now());

  const letra = letras[indice] ?? 'a';
  const modelo = LETRAS[letra] ?? [];
  const ancho = anchoLetra(letra);
  const tolerancia = toleranciaDe(escalon);
  const pista = errores >= ERRORES_PARA_PISTA;
  // Palabra de ejemplo que empieza por la letra ("m de mesa").
  const ejemplo = palabras.find((p) => p.texto.startsWith(letra));

  // Visibilidad del modelo según el escalón: 1 sólido → 5 sin modelo.
  const opacidadModelo = [0.55, 0.4, 0.22, 0, 0][Math.min(5, Math.max(1, escalon)) - 1] ?? 0.3;

  const aCoordenadas = (e: PointerEvent<SVGSVGElement>): Punto | null => {
    const svg = lienzo.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const empezar = (e: PointerEvent<SVGSVGElement>) => {
    if (completa || naranja) return;
    const p = aCoordenadas(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    setDibujo([p]);
  };

  const mover = (e: PointerEvent<SVGSVGElement>) => {
    if (!dibujando.current) return;
    const p = aCoordenadas(e);
    if (p) setDibujo((d) => [...d, p]);
  };

  const terminar = async () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    const objetivo = modelo[trazoActual];
    if (!objetivo) return;

    const resultado = evaluarTrazo(objetivo, dibujo, tolerancia);
    const bien = resultado === 'bien';
    registrar({
      item: letra,
      unidadObjetivo: letra,
      patron: 'trazo',
      respuesta: `trazo ${trazoActual + 1}: ${resultado}`,
      correcto: bien,
      errorTipo: bien ? null : resultado === 'al-reves' ? 'inversion' : 'forma',
      latenciaMs: performance.now() - inicio.current,
      ayudas: pista ? 1 : 0,
      intentoN: errores + 1,
    });
    inicio.current = performance.now();

    if (!bien) {
      // Feedback sin castigo: naranja suave 400 ms y se borra; el modelo sigue ahí.
      setNaranja(true);
      setErrores((x) => x + 1);
      await esperar(DURACION_ERROR_MS);
      setNaranja(false);
      setDibujo([]);
      if (resultado === 'al-reves') hablar('¡Empieza en el punto verde!');
      return;
    }

    sonidoClac();
    const nuevos = [...hechos, dibujo];
    setHechos(nuevos);
    setDibujo([]);
    if (trazoActual + 1 < modelo.length) {
      setTrazoActual(trazoActual + 1);
      return;
    }

    // ¡Letra terminada!
    if (errores === 0) aciertosPrimera.current++;
    setCompleta(true);
    sonidoAcierto();
    hablar(ejemplo ? `${letra}, de ${ejemplo.texto}` : letra);
    alAvanzar((indice + 1) / letras.length);
    await esperar(1900);

    if (indice + 1 >= letras.length) {
      alTerminar({ items: letras.length, aciertosPrimera: aciertosPrimera.current });
      return;
    }
    setIndice(indice + 1);
    setTrazoActual(0);
    setHechos([]);
    setErrores(0);
    setCompleta(false);
  };

  const ruta = (pts: readonly Punto[]) =>
    pts.length === 1 ? '' : pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const actual = modelo[trazoActual];
  const inicioTrazo = actual?.[0];
  // Flecha de dirección: del primer punto hacia uno un poco más adelante.
  const haciaDonde = actual?.[Math.min(actual.length - 1, 6)];

  return (
    <div className="relative flex h-full items-center justify-center gap-10 px-6 pb-4">
      <div className="flex flex-col items-center gap-4">
        <span className="texto-lectura text-[120px] font-bold leading-none text-mar">{letra}</span>
        {ejemplo && (
          <div className="flex flex-col items-center rounded-3xl bg-white p-3 shadow-md">
            <Pictograma id={ejemplo.img} tamano={110} />
            <span className="texto-lectura text-[36px] font-bold text-tinta">{ejemplo.texto}</span>
          </div>
        )}
      </div>

      <div className="relative rounded-[32px] bg-white shadow-lg">
        <Destellos disparo={completa ? 1 : 0} radio={220} />
        <svg
          ref={lienzo}
          viewBox={`-14 -12 ${ancho + 28} 146`}
          className="h-[min(72vh,560px)]"
          style={{ touchAction: 'none' }}
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={() => void terminar()}
          onPointerCancel={() => void terminar()}
          role="img"
          aria-label={`Traza la letra ${letra}`}
        >
          {/* Pauta de doble línea */}
          {[PAUTA.ascendente, PAUTA.media, PAUTA.base, PAUTA.descendente].map((y) => (
            <line
              key={y}
              x1={-14}
              x2={ancho + 14}
              y1={y}
              y2={y}
              stroke={y === PAUTA.base ? '#9aa5a8' : '#c9d6e8'}
              strokeWidth={y === PAUTA.base ? 1.4 : 0.9}
              strokeDasharray={y === PAUTA.media ? '3 3' : undefined}
            />
          ))}

          {/* Modelo (se va borrando según el escalón) */}
          {opacidadModelo > 0 &&
            modelo.map((t, i) =>
              t.length === 1 ? (
                <circle key={i} cx={t[0]!.x} cy={t[0]!.y} r={4} fill="#2d3436" opacity={opacidadModelo} />
              ) : (
                <path key={i} d={ruta(t)} fill="none" stroke="#2d3436" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={opacidadModelo} />
              ),
            )}

          {/* Pista tras dos errores: un punto recorre el trazo */}
          {pista && actual && actual.length > 1 && !completa && (
            <motion.circle
              key={`${indice}-${trazoActual}-${errores}`}
              r={5}
              fill="#f6b93b"
              initial={{ cx: actual[0]!.x, cy: actual[0]!.y }}
              animate={{ cx: actual.map((p) => p.x), cy: actual.map((p) => p.y) }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.4, ease: 'linear' }}
            />
          )}

          {/* Trazos ya bien hechos */}
          {hechos.map((t, i) =>
            t.length === 1 ? (
              <circle key={i} cx={t[0]!.x} cy={t[0]!.y} r={5} fill="#2f8f83" />
            ) : (
              <path key={i} d={ruta(t)} fill="none" stroke="#2f8f83" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            ),
          )}

          {/* Punto verde de inicio y flecha (salvo en el último escalón) */}
          {!completa && inicioTrazo && escalon < 5 && (
            <>
              <circle cx={inicioTrazo.x} cy={inicioTrazo.y} r={6} fill="#2ecc71" stroke="white" strokeWidth={1.5} />
              {haciaDonde && actual && actual.length > 1 && (
                <line
                  x1={inicioTrazo.x}
                  y1={inicioTrazo.y}
                  x2={haciaDonde.x}
                  y2={haciaDonde.y}
                  stroke="#2ecc71"
                  strokeWidth={2.5}
                  markerEnd="url(#flecha)"
                />
              )}
            </>
          )}
          <defs>
            <marker id="flecha" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#2ecc71" />
            </marker>
          </defs>

          {/* Lo que está dibujando ahora */}
          {dibujo.length > 0 && (
            <path
              d={dibujo.length === 1 ? `M${dibujo[0]!.x} ${dibujo[0]!.y} l0.1 0` : ruta(dibujo)}
              fill="none"
              stroke={naranja ? '#f8c291' : '#1f6a61'}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
