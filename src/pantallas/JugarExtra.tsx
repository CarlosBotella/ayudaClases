/**
 * Juegos que no son niveles del camino: los de ESCRITURA (casa y tutoría) y
 * los de jugar CON EL PROFE (solo tutoría). Usan las palabras del mundo y el
 * escalón de reto de la niña en cada juego.
 */
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { dbNina } from '../firebase.ts';
import type { JuegoEscritura, JuegoProfe } from '../datos/esquemas.ts';
import { useContenido, usePlan, useProgreso } from '../datos/hooks.ts';
import { DURACION_SESION_MS, useDispositivo, useSesionNina } from '../sesion/SesionNina.tsx';
import { calcularRetos, escalonDe } from '../lib/adaptativo.ts';
import { calcularEstrellas } from '../lib/estrellas.ts';
import { sonidoFanfarria } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Cargando from '../componentes/Cargando.tsx';
import FinNivel, { type Final } from '../componentes/FinNivel.tsx';
import { IconoFlechaAtras } from '../componentes/Iconos.tsx';
import { crearRegistrador, nuevoId } from '../juegos/registro.ts';
import type { ResultadoJuego } from '../juegos/tipos.ts';
import PantallaInstrucciones from '../juegos/PantallaInstrucciones.tsx';
import { instruccionEscritura, instruccionProfe } from '../juegos/instrucciones.ts';
import type { PalabraJuego } from '../juegos/profe/generar.ts';
import JuegoPillado from '../juegos/profe/JuegoPillado.tsx';
import JuegoDictado from '../juegos/profe/JuegoDictado.tsx';
import JuegoParejas from '../juegos/profe/JuegoParejas.tsx';
import JuegoTrazo from '../juegos/escritura/JuegoTrazo.tsx';
import JuegoCuaderno from '../juegos/escritura/JuegoCuaderno.tsx';

export type JuegoExtra = JuegoProfe | JuegoEscritura;

export const JUEGOS_PROFE: Array<{ juego: JuegoProfe; titulo: string }> = [
  { juego: 'pillado', titulo: '¡Pillado!' },
  { juego: 'dictado', titulo: 'Dictado mágico' },
  { juego: 'parejas', titulo: 'Parejas por turnos' },
];

export const JUEGOS_ESCRITURA: Array<{ juego: JuegoEscritura; titulo: string }> = [
  { juego: 'trazo', titulo: 'Traza la letra' },
  { juego: 'cuaderno', titulo: 'Dictado al cuaderno' },
];

const esProfe = (x: string | undefined): x is JuegoProfe => JUEGOS_PROFE.some((j) => j.juego === x);
const esEscritura = (x: string | undefined): x is JuegoEscritura => JUEGOS_ESCRITURA.some((j) => j.juego === x);

/** Id estable de "nivel" para guardar estrellas y progreso de estos juegos. */
export const idJuegoExtra = (mundo: number, juego: JuegoExtra) =>
  esProfe(juego) ? `m${mundo}-profe-${juego}` : `m${mundo}-escribir-${juego}`;

export default function JugarExtra() {
  const { mundo: texto, juego } = useParams();
  const mundo = Number(texto);
  const estado = useContenido(mundo);
  const sesion = useDispositivo();

  if (!sesion || !(esProfe(juego) || esEscritura(juego))) return <Navigate to="/" replace />;
  if (esProfe(juego) && sesion.dispositivo.contexto !== 'tutoria') return <Navigate to={`/mundo/${mundo}`} replace />;
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'vacio') return <Navigate to="/" replace />;

  const palabras: PalabraJuego[] = Object.entries(estado.datos.palabras).map(([t, p]) => ({
    texto: t,
    silabas: p.silabas,
    img: p.img,
  }));
  return <Partida key={juego} mundo={mundo} juego={juego} palabras={palabras} />;
}

function Partida({ mundo, juego, palabras }: { mundo: number; juego: JuegoExtra; palabras: PalabraJuego[] }) {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const { inicioSesion } = useSesionNina();
  const progreso = useProgreso(sesion?.dispositivo.studentId);
  const plan = usePlan(sesion?.dispositivo.studentId);
  const desdeMochila = (useLocation().state as { desdeMochila?: boolean } | null)?.desdeMochila === true;
  const [ronda, setRonda] = useState(0);
  const [avance, setAvance] = useState(0);
  const [escalon, setEscalon] = useState<number | null>(null);
  const [final, setFinal] = useState<Final | null>(null);
  const inicio = useRef(performance.now());
  const instruccion = esProfe(juego) ? instruccionProfe(juego) : instruccionEscritura(juego as JuegoEscritura);
  const lista = esProfe(juego) ? JUEGOS_PROFE : JUEGOS_ESCRITURA;

  // El escalón se fija al empezar cada ronda (no cambia a mitad de partida).
  const prepararRonda = () => {
    inicio.current = performance.now();
    setEscalon(escalonDe(calcularRetos(progreso.partidas, plan?.retoFijo ?? {}), juego));
  };

  const levelAttemptId = useMemo(() => nuevoId(), [ronda]); // eslint-disable-line react-hooks/exhaustive-deps
  const registrar = useMemo(
    () =>
      sesion
        ? crearRegistrador({
            db: dbNina(),
            studentId: sesion.dispositivo.studentId,
            contexto: sesion.dispositivo.contexto,
            mecanica: juego,
            levelAttemptId,
          })
        : () => undefined,
    [sesion, juego, levelAttemptId],
  );

  const alTerminar = (r: ResultadoJuego) => {
    const duracionMs = Math.round(performance.now() - inicio.current);
    const { estrellas, puntuacion } = calcularEstrellas({ mecanica: juego, items: r.items, aciertosPrimera: r.aciertosPrimera, duracionMs });
    if (sesion) {
      setDoc(doc(dbNina(), 'students', sesion.dispositivo.studentId, 'levelAttempts', levelAttemptId), {
        nivelId: idJuegoExtra(mundo, juego),
        mundo,
        nivel: (esProfe(juego) ? 100 : 110) + lista.findIndex((j) => j.juego === juego),
        mecanica: juego,
        estrellas,
        puntuacion,
        duracionMs,
        contexto: sesion.dispositivo.contexto,
        escalon: escalon ?? undefined,
        completadoEn: Timestamp.now(),
      }).catch((e: unknown) => console.warn('No se pudo guardar el juego', e));
    }
    sonidoFanfarria();
    setFinal({ estrellas });
  };

  const comunes = { mundo, palabras, escalon: escalon ?? 2, registrar, alTerminar, alAvanzar: setAvance };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-4 pt-3">
        <button
          type="button"
          onClick={() => navegar(desdeMochila ? '/mochila' : `/mundo/${mundo}`)}
          aria-label="Volver"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-mar shadow"
        >
          <IconoFlechaAtras className="size-9" />
        </button>
        <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/80">
          <motion.div className="h-full rounded-full bg-mar" animate={{ width: `${avance * 100}%` }} />
        </div>
        <button
          type="button"
          onClick={() => hablar(instruccion.nina)}
          aria-label="¿Qué hay que hacer?"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white font-sans text-4xl font-bold text-mar shadow"
        >
          ?
        </button>
      </div>

      <div className="relative min-h-0 flex-1" key={ronda}>
        {escalon === null ? (
          <PantallaInstrucciones mecanica={juego} instruccion={instruccion} onEmpezar={prepararRonda} />
        ) : final ? (
          <FinNivel
            final={final}
            onOtraVez={() => {
              setFinal(null);
              setAvance(0);
              prepararRonda();
              setRonda((r) => r + 1);
            }}
            onSeguir={() =>
              navegar(
                desdeMochila ? '/mochila' : Date.now() - inicioSesion >= DURACION_SESION_MS ? '/fin' : `/mundo/${mundo}`,
              )
            }
          />
        ) : juego === 'pillado' ? (
          <JuegoPillado {...comunes} />
        ) : juego === 'dictado' ? (
          <JuegoDictado {...comunes} />
        ) : juego === 'parejas' ? (
          <JuegoParejas {...comunes} />
        ) : juego === 'trazo' ? (
          <JuegoTrazo {...comunes} />
        ) : (
          <JuegoCuaderno {...comunes} />
        )}
      </div>
    </div>
  );
}
