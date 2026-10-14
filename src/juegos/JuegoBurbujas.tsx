/**
 * PESCA DE BURBUJAS
 * Arriba, la sílaba objetivo (bla), un altavoz y un pictograma de apoyo.
 * Suben burbujas despacio: unas con la objetivo (~40 %) y otras con
 * distractores etiquetados (bal, dla, pla, ba). Hay que reventar solo las
 * objetivo hasta llenar el contador. Las que salen por arriba vuelven a
 * entrar por abajo: nunca se pierde nada.
 */
import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NivelBurbujas, TipoErrorDatos } from '../datos/esquemas.ts';
import { sonidoPop } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Destellos from '../componentes/Destellos.tsx';
import EscenaVista from '../componentes/EscenaVista.tsx';
import Ficha from '../componentes/Ficha.tsx';
import { IconoAltavoz } from '../componentes/Iconos.tsx';
import { ERRORES_PARA_PISTA, type PropsJuego } from './tipos.ts';

interface Burbuja {
  id: number;
  carril: number;
  texto: string;
  objetivo: boolean;
  tipo: TipoErrorDatos | null;
  duracion: number;
  retraso: number;
  estallada: boolean;
}

let contadorIds = 0;

export default function JuegoBurbujas({ nivel, contenido, registrar, alTerminar, alAvanzar }: PropsJuego<NivelBurbujas>) {
  const carriles = nivel.esFrase ? Math.min(3, nivel.maxBurbujas) : nivel.maxBurbujas;
  // Las frases van en burbujas alargadas y con menos carriles para respetar los 48 px de letra.
  const tamano = nivel.esFrase ? 290 : 128;

  const zona = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [erroresSeguidos, setErroresSeguidos] = useState(0);
  const [fallos, setFallos] = useState<Record<number, number>>({});
  const aciertosPrimera = useRef(0);
  const ultimoAcierto = useRef(performance.now());
  const terminado = useRef(false);

  const crearBurbuja = useCallback(
    (carril: number, otras: readonly Burbuja[], retraso: number): Burbuja => {
      const hayObjetivo = otras.some((b) => b.objetivo && !b.estallada && b.carril !== carril);
      const objetivo = !hayObjetivo || Math.random() < nivel.proporcion;
      const distractor = nivel.distractores[Math.floor(Math.random() * nivel.distractores.length)];
      return {
        id: ++contadorIds,
        carril,
        texto: objetivo || !distractor ? nivel.objetivo : distractor.texto,
        objetivo: objetivo || !distractor,
        tipo: objetivo || !distractor ? null : distractor.tipo,
        duracion: nivel.velocidad * (0.9 + Math.random() * 0.25),
        retraso,
        estallada: false,
      };
    },
    [nivel],
  );

  const [burbujas, setBurbujas] = useState<Burbuja[]>(() => {
    const lista: Burbuja[] = [];
    for (let c = 0; c < carriles; c++) {
      lista.push(crearBurbuja(c, lista, (c * nivel.velocidad) / carriles + Math.random() * 0.8));
    }
    return lista;
  });

  // Altura de la zona de juego (para saber desde dónde suben).
  useLayoutEffect(() => {
    const el = zona.current;
    if (!el) return;
    const medir = () => setAlto(el.clientHeight);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => hablar(nivel.objetivo), 500);
    return () => window.clearTimeout(t);
  }, [nivel.objetivo]);

  const pista = erroresSeguidos >= ERRORES_PARA_PISTA;

  const tocar = (b: Burbuja) => {
    if (b.estallada || terminado.current) return;
    registrar({
      item: nivel.objetivo,
      unidadObjetivo: nivel.objetivo,
      patron: nivel.patron,
      respuesta: b.texto,
      correcto: b.objetivo,
      errorTipo: b.objetivo ? null : b.tipo,
      latenciaMs: performance.now() - ultimoAcierto.current,
      ayudas: pista ? 1 : 0,
      intentoN: erroresSeguidos + 1,
    });

    if (!b.objetivo) {
      setFallos((f) => ({ ...f, [b.id]: (f[b.id] ?? 0) + 1 }));
      setErroresSeguidos((e) => e + 1);
      return;
    }

    if (erroresSeguidos === 0) aciertosPrimera.current++;
    ultimoAcierto.current = performance.now();
    setErroresSeguidos(0);
    sonidoPop();
    hablar(nivel.objetivo);
    setBurbujas((lista) => lista.map((x) => (x.id === b.id ? { ...x, estallada: true } : x)));

    const nuevos = aciertos + 1;
    setAciertos(nuevos);
    alAvanzar(nuevos / nivel.meta);
    if (nuevos >= nivel.meta) {
      terminado.current = true;
      window.setTimeout(() => alTerminar({ items: nivel.meta, aciertosPrimera: aciertosPrimera.current }), 900);
      return;
    }
    // Una burbuja nueva ocupa su carril.
    window.setTimeout(() => {
      setBurbujas((lista) => {
        const resto = lista.filter((x) => x.id !== b.id);
        return [...resto, crearBurbuja(b.carril, resto, Math.random() * 0.6)];
      });
    }, 450);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Cabecera: objetivo, altavoz, dibujo de apoyo y contador */}
      <div className="flex items-center justify-center gap-6 px-6 pt-2">
        <div className="rounded-3xl bg-white px-8 py-2 shadow-md">
          <span className={`texto-lectura font-bold text-mar ${nivel.esFrase ? 'text-[52px]' : 'text-[72px]'}`}>
            {nivel.objetivo}
          </span>
        </div>
        <button
          type="button"
          onClick={() => hablar(nivel.objetivo)}
          aria-label="Escuchar"
          className="flex size-20 items-center justify-center rounded-full bg-mar text-white shadow-md active:scale-95"
        >
          <IconoAltavoz className="size-11" />
        </button>
        <div className="rounded-3xl bg-white/80 p-1 shadow-sm">
          <EscenaVista escena={nivel.pista} imagenes={contenido.palabras} base={nivel.esFrase ? 70 : 90} />
        </div>
        <div className="flex max-w-56 flex-wrap gap-2" aria-label={`${aciertos} de ${nivel.meta}`}>
          {Array.from({ length: nivel.meta }, (_, i) => (
            <motion.span
              key={i}
              className={`block size-7 rounded-full border-4 ${i < aciertos ? 'border-sol bg-sol' : 'border-sol/40 bg-white'}`}
              animate={i === aciertos - 1 ? { scale: [1, 1.5, 1] } : {}}
            />
          ))}
        </div>
      </div>

      {/* Zona del agua */}
      <div ref={zona} className="relative mx-4 mb-4 mt-3 flex-1 overflow-hidden rounded-[40px] bg-gradient-to-b from-sky-100 to-sky-300/70">
        {alto > 0 &&
          burbujas.map((b) => (
            <motion.div
              key={b.id}
              className="absolute"
              style={{ left: `${((b.carril + 0.5) * 100) / carriles}%`, marginLeft: -tamano / 2 }}
              initial={{ y: alto }}
              animate={{ y: -tamano - 20 }}
              transition={{ duration: b.duracion, ease: 'linear', repeat: Infinity, delay: b.retraso }}
            >
              <motion.div
                className="relative"
                animate={b.estallada ? { scale: 1.6, opacity: 0 } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Destellos disparo={b.estallada ? 1 : 0} radio={90} />
                <Ficha
                  onClick={() => tocar(b)}
                  fallos={fallos[b.id] ?? 0}
                  pista={pista && b.objetivo}
                  etiqueta={b.texto}
                  colorNormal="bg-white/85"
                  className={`flex items-center justify-center border-4 border-white shadow-lg ${
                    nivel.esFrase ? 'min-h-36 w-[290px] rounded-[56px] px-4 py-2' : 'size-32 rounded-full'
                  }`}
                >
                  <span
                    className={`texto-lectura font-bold leading-tight text-tinta ${
                      'text-[48px]'
                    }`}
                  >
                    {b.texto}
                  </span>
                </Ficha>
              </motion.div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
