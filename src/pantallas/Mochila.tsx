/**
 * LA MOCHILA: deberes de hoy (solo tablet de casa).
 * Arriba, la semana (L M X J V S D) con los días hechos; abajo, las tareas de
 * hoy como tarjetas grandes que se tachan al completarlas.
 */
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { Actividad } from '../datos/esquemas.ts';
import { useContenido, usePlan, useProgreso } from '../datos/hooks.ts';
import { useDispositivo } from '../sesion/SesionNina.tsx';
import { ACTIVIDADES_ESCRITURA, hechasElDia, NOMBRE_ACTIVIDAD, nivelParaActividad, semanaDeDeberes } from '../lib/deberes.ts';
import { sonidoFanfarria } from '../lib/sonidos.ts';
import { hablar } from '../lib/voz.ts';
import Cargando from '../componentes/Cargando.tsx';
import Destellos from '../componentes/Destellos.tsx';
import { ICONO_MECANICA, IconoBien, IconoEstrella, IconoFlechaAtras, IconoMochila } from '../componentes/Iconos.tsx';

export default function Mochila() {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const sid = sesion?.dispositivo.studentId;
  const plan = usePlan(sid);
  const progreso = useProgreso(sid);
  const deberes = plan?.deberes?.activos ? plan.deberes : null;
  const contenido = useContenido(deberes?.mundo ?? 1);
  const avisado = useRef(false);

  const hoy = new Date();
  const hechas = deberes ? hechasElDia(deberes, progreso.partidas, hoy) : new Set<Actividad>();
  const todoHecho = deberes !== null && hechas.size === deberes.actividades.length;

  // Al completar los deberes de hoy, celebración (una vez).
  useEffect(() => {
    if (todoHecho && !avisado.current) {
      avisado.current = true;
      sonidoFanfarria();
      hablar('¡Deberes de hoy hechos! ¡Muy bien!');
    }
  }, [todoHecho]);

  if (!sesion || sesion.dispositivo.contexto !== 'casa') return <Navigate to="/" replace />;
  if (!deberes) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-6 font-sans">
        <IconoMochila className="size-32 text-mar/40" />
        <p className="text-3xl font-bold text-tinta/60">Hoy no hay deberes</p>
        <button type="button" onClick={() => navegar('/')} className="min-h-16 rounded-full bg-sol px-10 text-2xl font-bold text-white">
          Volver
        </button>
      </main>
    );
  }
  if (contenido.tipo === 'cargando') return <Cargando />;

  const semana = semanaDeDeberes(deberes, progreso.partidas, hoy);

  const ir = (a: Actividad) => {
    const estado = { state: { desdeMochila: true } };
    if (ACTIVIDADES_ESCRITURA.includes(a)) {
      navegar(`/escribir/${deberes.mundo}/${a}`, estado);
      return;
    }
    if (contenido.tipo !== 'listo') return;
    const nivel = nivelParaActividad(contenido.datos, a, progreso.mejores);
    if (nivel) navegar(`/jugar/${deberes.mundo}/${nivel.id}`, estado);
  };

  return (
    <main className="relative flex h-full flex-col gap-6 overflow-y-auto bg-gradient-to-b from-crema to-arena px-6 pb-8 pt-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navegar('/')}
          aria-label="Volver al mapa"
          className="flex size-16 items-center justify-center rounded-full bg-white text-mar shadow"
        >
          <IconoFlechaAtras className="size-9" />
        </button>
        <IconoMochila className="size-14 text-sol" />

        {/* La semana */}
        <div className="ml-auto flex items-center gap-2" aria-label={`${semana.completos} de ${semana.objetivo} días esta semana`}>
          {semana.dias.map((d) => (
            <div
              key={d.clave}
              className={`flex size-14 flex-col items-center justify-center rounded-full font-sans text-lg font-bold ${
                d.completo ? 'bg-sol text-white' : d.parcial ? 'bg-sol/30 text-tinta' : 'bg-white/70 text-tinta/40'
              } ${d.esHoy ? 'ring-4 ring-mar' : ''}`}
            >
              {d.completo ? <IconoEstrella className="size-7" /> : d.letra}
            </div>
          ))}
          <span className="ml-3 rounded-full bg-white px-4 py-2 font-sans text-2xl font-bold text-mar">
            {semana.completos}/{semana.objetivo}
          </span>
        </div>
      </div>

      {/* Tareas de hoy */}
      <div className="relative flex flex-1 flex-wrap content-center items-center justify-center gap-6">
        <Destellos disparo={todoHecho ? 1 : 0} radio={320} />
        {deberes.actividades.map((a, i) => {
          const Icono = ICONO_MECANICA[a];
          const hecha = hechas.has(a);
          return (
            <motion.button
              key={a}
              type="button"
              onClick={() => ir(a)}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`${NOMBRE_ACTIVIDAD[a]}${hecha ? ' (hecha)' : ''}`}
              className={`relative flex h-52 w-52 flex-col items-center justify-center gap-3 rounded-[40px] shadow-lg ${
                hecha ? 'bg-white/60' : 'bg-white'
              }`}
            >
              <span className={`flex size-28 items-center justify-center rounded-full text-white ${hecha ? 'bg-mar/40' : 'bg-mar'}`}>
                <Icono className="size-16" />
              </span>
              <span className="px-3 text-center font-sans text-lg font-bold text-tinta/70">{NOMBRE_ACTIVIDAD[a]}</span>
              {hecha && (
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: -8 }}
                  className="absolute -right-3 -top-3 flex size-16 items-center justify-center rounded-full bg-sol text-white shadow-lg"
                >
                  <IconoBien className="size-10" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </main>
  );
}
