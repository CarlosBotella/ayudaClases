/**
 * Pantalla de un nivel: carga el contenido, monta el minijuego que toque,
 * guarda el resultado (estrellas) y muestra la celebración de fin de nivel.
 */
import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { dbNina } from '../firebase.ts';
import type { Contenido, Nivel } from '../datos/esquemas.ts';
import { useContenido, useProgreso } from '../datos/hooks.ts';
import { DURACION_SESION_MS, useDispositivo, useSesionNina } from '../sesion/SesionNina.tsx';
import { calcularEstrellas } from '../lib/estrellas.ts';
import { sonidoFanfarria } from '../lib/sonidos.ts';
import { IconoEstrella, IconoFlechaAtras, IconoOtraVez, IconoPlay } from '../componentes/Iconos.tsx';
import Pictograma from '../componentes/Pictograma.tsx';
import Destellos from '../componentes/Destellos.tsx';
import Cargando from '../componentes/Cargando.tsx';
import { crearRegistrador, nuevoId } from '../juegos/registro.ts';
import type { ResultadoJuego } from '../juegos/tipos.ts';
import JuegoIntrusa from '../juegos/JuegoIntrusa.tsx';
import JuegoBurbujas from '../juegos/JuegoBurbujas.tsx';
import JuegoTren from '../juegos/JuegoTren.tsx';
import JuegoDetective from '../juegos/JuegoDetective.tsx';
import JuegoCarrera from '../juegos/JuegoCarrera.tsx';

interface Final {
  estrellas: number;
  pegatina?: { palabra: string; img: number };
}

export default function Jugar() {
  const { mundo: mundoTexto, nivelId } = useParams();
  const mundo = Number(mundoTexto);
  const estado = useContenido(mundo);
  const sesion = useDispositivo();

  if (!sesion) return <Navigate to="/" replace />;
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'vacio') return <Navigate to="/" replace />;

  const indice = estado.datos.niveles.findIndex((n) => n.id === nivelId);
  const nivel = estado.datos.niveles[indice];
  if (!nivel) return <Navigate to={`/mundo/${mundo}`} replace />;

  return <Partida key={nivel.id} contenido={estado.datos} nivel={nivel} indice={indice} />;
}

function Partida({ contenido, nivel, indice }: { contenido: Contenido; nivel: Nivel; indice: number }) {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const { inicioSesion } = useSesionNina();
  const progreso = useProgreso(sesion?.dispositivo.studentId);
  const [ronda, setRonda] = useState(0);
  const [avance, setAvance] = useState(0);
  const [final, setFinal] = useState<Final | null>(null);
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
    setRonda((r) => r + 1);
  };

  const seguir = () => {
    if (Date.now() - inicioSesion >= DURACION_SESION_MS) navegar('/fin');
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
      </div>

      <div className="relative min-h-0 flex-1" key={ronda}>
        {final ? (
          <FinNivel final={final} onOtraVez={otraVez} onSeguir={seguir} />
        ) : nivel.mecanica === 'intrusa' ? (
          <JuegoIntrusa nivel={nivel} {...comunes} />
        ) : nivel.mecanica === 'burbujas' ? (
          <JuegoBurbujas nivel={nivel} {...comunes} />
        ) : nivel.mecanica === 'tren' ? (
          <JuegoTren nivel={nivel} {...comunes} />
        ) : nivel.mecanica === 'detective' ? (
          <JuegoDetective nivel={nivel} {...comunes} />
        ) : (
          <JuegoCarrera nivel={nivel} mejor={mejor} {...comunes} />
        )}
      </div>
    </div>
  );
}

function FinNivel({ final, onOtraVez, onSeguir }: { final: Final; onOtraVez: () => void; onSeguir: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10">
      <div className="relative flex items-end gap-6">
        <Destellos disparo={1} radio={260} />
        {[1, 2, 3].map((n) => (
          <motion.div
            key={n}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: n === 2 ? 1.25 : 1, rotate: 0 }}
            transition={{ delay: 0.25 + n * 0.3, type: 'spring', stiffness: 220, damping: 12 }}
            className={n <= final.estrellas ? 'text-sol drop-shadow-lg' : 'text-tinta/15'}
          >
            <IconoEstrella className="size-32" llena={n <= final.estrellas} />
          </motion.div>
        ))}
      </div>

      {final.pegatina && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="flex items-center gap-4 rounded-3xl bg-white px-6 py-3 shadow-md"
        >
          <Pictograma id={final.pegatina.img} tamano={90} />
          <span className="texto-lectura text-[48px] font-bold text-sol">{final.pegatina.palabra}</span>
        </motion.div>
      )}

      <motion.div
        className="flex gap-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        <button
          type="button"
          onClick={onOtraVez}
          aria-label="Jugar otra vez"
          className="flex size-28 items-center justify-center rounded-full bg-white text-mar shadow-lg active:scale-95"
        >
          <IconoOtraVez className="size-14" />
        </button>
        <button
          type="button"
          onClick={onSeguir}
          aria-label="Seguir"
          className="flex size-28 items-center justify-center rounded-full bg-sol text-white shadow-[0_8px_0_0_#d9952a] active:translate-y-2"
        >
          <IconoPlay className="ml-2 size-14" />
        </button>
      </motion.div>
    </div>
  );
}
