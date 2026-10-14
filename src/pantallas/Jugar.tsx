/**
 * Pantalla de un nivel: carga el contenido, monta el minijuego que toque,
 * guarda el resultado (estrellas) y muestra la celebración de fin de nivel.
 */
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { dbNina } from '../firebase.ts';
import type { Contenido, Nivel } from '../datos/esquemas.ts';
import { useContenido, usePlan, useProgreso } from '../datos/hooks.ts';
import { nivelesDelAlumno } from '../generador/repaso.ts';
import { calcularRetos, escalonDe } from '../lib/adaptativo.ts';
import { ajustarNivel } from '../juegos/ajustar.ts';
import { DURACION_SESION_MS, useDispositivo, useSesionNina } from '../sesion/SesionNina.tsx';
import { calcularEstrellas } from '../lib/estrellas.ts';
import { sonidoFanfarria } from '../lib/sonidos.ts';
import { IconoFlechaAtras } from '../componentes/Iconos.tsx';
import FinNivel, { type Final } from '../componentes/FinNivel.tsx';
import Cargando from '../componentes/Cargando.tsx';
import { crearRegistrador, nuevoId } from '../juegos/registro.ts';
import type { ResultadoJuego } from '../juegos/tipos.ts';
import JuegoIntrusa from '../juegos/JuegoIntrusa.tsx';
import JuegoBurbujas from '../juegos/JuegoBurbujas.tsx';
import JuegoTren from '../juegos/JuegoTren.tsx';
import JuegoDetective from '../juegos/JuegoDetective.tsx';
import JuegoCarrera from '../juegos/JuegoCarrera.tsx';
import PantallaInstrucciones from '../juegos/PantallaInstrucciones.tsx';
import { instruccionDe } from '../juegos/instrucciones.ts';
import { hablar } from '../lib/voz.ts';


export default function Jugar() {
  const { mundo: mundoTexto, nivelId } = useParams();
  const mundo = Number(mundoTexto);
  const estado = useContenido(mundo);
  const sesion = useDispositivo();
  const planAlumno = usePlan(sesion?.dispositivo.studentId);

  if (!sesion) return <Navigate to="/" replace />;
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'vacio') return <Navigate to="/" replace />;

  const niveles = nivelesDelAlumno(estado.datos, planAlumno?.repasos ?? {});
  const indice = niveles.findIndex((n) => n.id === nivelId);
  const nivel = niveles[indice];
  if (!nivel) return <Navigate to={`/mundo/${mundo}`} replace />;

  return <Partida key={nivel.id} contenido={estado.datos} nivel={nivel} indice={indice} />;
}

function Partida({ contenido, nivel, indice }: { contenido: Contenido; nivel: Nivel; indice: number }) {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const { inicioSesion } = useSesionNina();
  const progreso = useProgreso(sesion?.dispositivo.studentId);
  const plan = usePlan(sesion?.dispositivo.studentId);
  const desdeMochila = (useLocation().state as { desdeMochila?: boolean } | null)?.desdeMochila === true;
  const [ronda, setRonda] = useState(0);
  // Nivel ajustado a su escalón de reto. Se fija al empezar cada ronda (no cambia a mitad de partida).
  const [jugando, setJugando] = useState<{ nivel: Nivel; escalon: number } | null>(null);
  const prepararRonda = () => {
    const escalon = escalonDe(calcularRetos(progreso.partidas, plan?.retoFijo ?? {}), nivel.mecanica);
    setJugando({ nivel: ajustarNivel(nivel, escalon, contenido), escalon });
  };
  const [avance, setAvance] = useState(0);
  const [final, setFinal] = useState<Final | null>(null);
  // Primero la explicación; al pulsar ▶ empieza el juego (y el cronómetro).
  const [empezado, setEmpezado] = useState(false);
  const inicio = useRef(performance.now());

  // Cada ronda (cada "otra vez") es un intento de nivel nuevo, con su id.
  const levelAttemptId = useMemo(() => nuevoId(), [ronda]); // eslint-disable-line react-hooks/exhaustive-deps
  const registrar = useMemo(
    () =>
      sesion
        ? crearRegistrador({
            db: dbNina(),
            studentId: sesion.dispositivo.studentId,
            contexto: sesion.dispositivo.contexto,
            mecanica: nivel.mecanica,
            levelAttemptId,
          })
        : () => undefined,
    [sesion, nivel.mecanica, levelAttemptId],
  );

  const mejor = progreso.mejores.get(nivel.id);

  const alTerminar = (r: ResultadoJuego) => {
    const duracionMs = Math.round(performance.now() - inicio.current);
    const { estrellas, puntuacion } = calcularEstrellas({
      mecanica: nivel.mecanica,
      items: r.items,
      aciertosPrimera: r.aciertosPrimera,
      duracionMs,
      ganaAlFantasma: r.ganaAlFantasma,
    });

    if (sesion) {
      const ref = doc(dbNina(), 'students', sesion.dispositivo.studentId, 'levelAttempts', levelAttemptId);
      setDoc(ref, {
        nivelId: nivel.id,
        mundo: contenido.mundo,
        nivel: indice,
        mecanica: nivel.mecanica,
        estrellas,
        puntuacion,
        duracionMs,
        pcpm: r.pcpm,
        contexto: sesion.dispositivo.contexto,
        pegatina: r.pegatina?.palabra,
        pegatinaImg: r.pegatina?.img,
        escalon: jugando?.escalon,
        completadoEn: Timestamp.now(),
      }).catch((e: unknown) => console.warn('No se pudo guardar el nivel', e));
    }

    sonidoFanfarria();
    setFinal({ estrellas, pegatina: r.pegatina });
  };

  const otraVez = () => {
    setFinal(null);
    setAvance(0);
    inicio.current = performance.now();
    prepararRonda();
    setRonda((r) => r + 1);
  };

  const seguir = () => {
    if (desdeMochila) navegar('/mochila');
    else if (Date.now() - inicioSesion >= DURACION_SESION_MS) navegar('/fin');
    else navegar(`/mundo/${contenido.mundo}`);
  };

  const comunes = { contenido, registrar, alTerminar, alAvanzar: setAvance };

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior: volver y avance */}
      <div className="flex items-center gap-4 px-4 pt-3">
        <button
          type="button"
          onClick={() => navegar(`/mundo/${contenido.mundo}`)}
          aria-label="Volver al mundo"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-mar shadow"
        >
          <IconoFlechaAtras className="size-9" />
        </button>
        <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/80">
          <motion.div className="h-full rounded-full bg-sol" animate={{ width: `${avance * 100}%` }} />
        </div>
        <button
          type="button"
          onClick={() => hablar(instruccionDe(nivel).nina)}
          aria-label="¿Qué hay que hacer?"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white font-sans text-4xl font-bold text-mar shadow"
        >
          ?
        </button>
      </div>

      <div className="relative min-h-0 flex-1" key={ronda}>
        {!empezado ? (
          <PantallaInstrucciones
            mecanica={nivel.mecanica}
            instruccion={instruccionDe(nivel)}
            onEmpezar={() => {
              inicio.current = performance.now();
              prepararRonda();
              setEmpezado(true);
            }}
          />
        ) : final ? (
          <FinNivel final={final} onOtraVez={otraVez} onSeguir={seguir} />
        ) : !jugando ? null : jugando.nivel.mecanica === 'intrusa' ? (
          <JuegoIntrusa nivel={jugando.nivel} {...comunes} />
        ) : jugando.nivel.mecanica === 'burbujas' ? (
          <JuegoBurbujas nivel={jugando.nivel} {...comunes} />
        ) : jugando.nivel.mecanica === 'tren' ? (
          <JuegoTren nivel={jugando.nivel} {...comunes} />
        ) : jugando.nivel.mecanica === 'detective' ? (
          <JuegoDetective nivel={jugando.nivel} {...comunes} />
        ) : (
          <JuegoCarrera nivel={jugando.nivel} mejor={mejor} {...comunes} />
        )}
      </div>
    </div>
  );
}
