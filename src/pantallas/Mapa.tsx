/**
 * Mapa de mundos: cinco islas unidas por un camino. Un mundo se abre cuando
 * el tutor lo ha generado y guardado (así el tutor decide el ritmo).
 */
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MUNDOS } from '../lib/clasificador.ts';
import { estrellasDeMundo } from '../lib/progreso.ts';
import { useProgreso, useTodosLosMundos } from '../datos/hooks.ts';
import { useDispositivo } from '../sesion/SesionNina.tsx';
import { prepararVoz } from '../lib/voz.ts';
import { IconoAlbum, IconoCandado, IconoEstrella } from '../componentes/Iconos.tsx';
import PuertaParental from '../componentes/PuertaParental.tsx';

/** Posición (en %) y color de cada isla. */
const ISLAS = [
  { x: 12, y: 62, color: '#f6b93b' },
  { x: 31, y: 30, color: '#78c27d' },
  { x: 50, y: 64, color: '#a88bd8' },
  { x: 69, y: 30, color: '#5bb5e0' },
  { x: 88, y: 60, color: '#e89a6b' },
];

export default function Mapa() {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const { mundos } = useTodosLosMundos();
  const progreso = useProgreso(sesion?.dispositivo.studentId);

  useEffect(() => {
    void prepararVoz();
  }, []);

  const camino = ISLAS.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 10} ${p.y * 6}`).join(' ');

  return (
    <main className="relative h-full overflow-hidden bg-gradient-to-b from-sky-200 to-sky-300/80">
      {/* Camino entre islas */}
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={camino} fill="none" stroke="#fff8ec" strokeWidth={14} strokeDasharray="4 26" strokeLinecap="round" />
      </svg>

      {MUNDOS.map((m, i) => {
        const isla = ISLAS[i]!;
        const contenido = mundos[m.n];
        const abierto = Boolean(contenido);
        const { conseguidas, posibles } = contenido
          ? estrellasDeMundo(progreso, contenido.niveles.map((n) => n.id))
          : { conseguidas: 0, posibles: 0 };

        return (
          <motion.button
            key={m.n}
            type="button"
            disabled={!abierto}
            onClick={() => navegar(`/mundo/${m.n}`)}
            aria-label={`${m.nombre}${abierto ? '' : ' (cerrado)'}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={abierto ? { scale: 0.92 } : undefined}
            transition={{ delay: i * 0.08, type: 'spring' }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
            style={{ left: `${isla.x}%`, top: `${isla.y}%` }}
          >
            <span
              className="flex size-36 items-center justify-center rounded-full border-8 border-white shadow-xl"
              style={{ background: abierto ? isla.color : '#cfd8dc' }}
            >
              {abierto ? (
                <span className="font-lectura text-[72px] font-bold text-white drop-shadow">{m.n}</span>
              ) : (
                <IconoCandado className="size-14 text-white" />
              )}
            </span>
            <span className="max-w-48 rounded-full bg-white/85 px-3 py-1 text-center font-sans text-sm font-bold text-tinta/80">
              {m.nombre}
            </span>
            {abierto && posibles > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-white/85 px-3 py-0.5 font-sans text-lg font-bold text-sol">
                <IconoEstrella className="size-6" /> {conseguidas}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Álbum de pegatinas */}
      <button
        type="button"
        onClick={() => navegar('/album')}
        aria-label="Álbum de pegatinas"
        className="absolute right-5 top-5 flex size-20 items-center justify-center rounded-3xl bg-white text-sol shadow-lg active:scale-95"
      >
        <IconoAlbum className="size-12" />
      </button>

      <PuertaParental
        className="absolute bottom-4 left-4"
        onAbrir={() => navegar('/adulto', { state: { puerta: true } })}
      />
    </main>
  );
}
