/**
 * Juegos "con el profe" (solo en tablets de tutoría): explicación, juego,
 * guardado del resultado y celebración. Usan las palabras del mundo.
 */
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { dbNina } from '../firebase.ts';
import type { JuegoProfe } from '../datos/esquemas.ts';
import { useContenido } from '../datos/hooks.ts';
import { DURACION_SESION_MS, useDispositivo, useSesionNina } from '../sesion/SesionNina.tsx';
import { calcularEstrellas } from '../lib/estrellas.ts';
import { sonidoFanfarria } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Cargando from '../componentes/Cargando.tsx';
import FinNivel, { type Final } from '../componentes/FinNivel.tsx';
import { IconoFlechaAtras } from '../componentes/Iconos.tsx';
import { crearRegistrador, nuevoId } from '../juegos/registro.ts';
import type { ResultadoJuego } from '../juegos/tipos.ts';
import PantallaInstrucciones from '../juegos/PantallaInstrucciones.tsx';
import { instruccionProfe } from '../juegos/instrucciones.ts';
import type { PalabraJuego } from '../juegos/profe/generar.ts';
import JuegoPillado from '../juegos/profe/JuegoPillado.tsx';
import JuegoDictado from '../juegos/profe/JuegoDictado.tsx';
import JuegoParejas from '../juegos/profe/JuegoParejas.tsx';

export const JUEGOS_PROFE: Array<{ juego: JuegoProfe; titulo: string }> = [
  { juego: 'pillado', titulo: '¡Pillado!' },
  { juego: 'dictado', titulo: 'Dictado mágico' },
  { juego: 'parejas', titulo: 'Parejas por turnos' },
];

const esJuegoProfe = (x: string | undefined): x is JuegoProfe => JUEGOS_PROFE.some((j) => j.juego === x);

export default function JugarProfe() {
  const { mundo: texto, juego } = useParams();
  const mundo = Number(texto);
  const estado = useContenido(mundo);
  const sesion = useDispositivo();

  if (!sesion || !esJuegoProfe(juego)) return <Navigate to="/" replace />;
  if (sesion.dispositivo.contexto !== 'tutoria') return <Navigate to={`/mundo/${mundo}`} replace />;
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'vacio') return <Navigate to="/" replace />;

  const palabras: PalabraJuego[] = Object.entries(estado.datos.palabras).map(([t, p]) => ({
    texto: t,
    silabas: p.silabas,
    img: p.img,
  }));
  return <PartidaProfe key={juego} mundo={mundo} juego={juego} palabras={palabras} />;
}

function PartidaProfe({ mundo, juego, palabras }: { mundo: number; juego: JuegoProfe; palabras: PalabraJuego[] }) {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const { inicioSesion } = useSesionNina();
  const [ronda, setRonda] = useState(0);
  const [avance, setAvance] = useState(0);
  const [empezado, setEmpezado] = useState(false);
  const [final, setFinal] = useState<Final | null>(null);
  const inicio = useRef(performance.now());
  const instruccion = instruccionProfe(juego);

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
        nivelId: `m${mundo}-profe-${juego}`,
        mundo,
        nivel: 100 + JUEGOS_PROFE.findIndex((j) => j.juego === juego),
        mecanica: juego,
        estrellas,
        puntuacion,
        duracionMs,
        contexto: sesion.dispositivo.contexto,
        completadoEn: Timestamp.now(),
      }).catch((e: unknown) => console.warn('No se pudo guardar el juego', e));
    }
    sonidoFanfarria();
    setFinal({ estrellas });
  };

  const comunes = { mundo, palabras, registrar, alTerminar, alAvanzar: setAvance };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-4 pt-3">
        <button
          type="button"
          onClick={() => navegar(`/mundo/${mundo}`)}
          aria-label="Volver al mundo"
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
        {!empezado ? (
          <PantallaInstrucciones
            mecanica={juego}
            instruccion={instruccion}
            onEmpezar={() => {
              inicio.current = performance.now();
              setEmpezado(true);
            }}
          />
        ) : final ? (
          <FinNivel
            final={final}
            onOtraVez={() => {
              setFinal(null);
              setAvance(0);
              inicio.current = performance.now();
              setRonda((r) => r + 1);
            }}
            onSeguir={() =>
              navegar(Date.now() - inicioSesion >= DURACION_SESION_MS ? '/fin' : `/mundo/${mundo}`)
            }
          />
        ) : juego === 'pillado' ? (
          <JuegoPillado {...comunes} />
        ) : juego === 'dictado' ? (
          <JuegoDictado {...comunes} />
        ) : (
          <JuegoParejas {...comunes} />
        )}
      </div>
    </div>
  );
}
