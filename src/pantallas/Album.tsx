/**
 * Álbum de pegatinas.
 *  - Arriba: las pegatinas de "palabra secreta" (las gana en la letra intrusa).
 *  - Abajo: una pegatina por cada estrella, con dibujos de las palabras de sus mundos.
 * Las que faltan se ven como huecos con interrogación: dan ganas de completarlas.
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProgreso, useTodosLosMundos } from '../datos/hooks.ts';
import { useDispositivo } from '../sesion/SesionNina.tsx';
import Pictograma from '../componentes/Pictograma.tsx';
import { IconoEstrella, IconoFlechaAtras } from '../componentes/Iconos.tsx';

export default function Album() {
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const progreso = useProgreso(sesion?.dispositivo.studentId);
  const { mundos } = useTodosLosMundos();

  // Pegatinas de estrella: palabras de los mundos abiertos, en orden alfabético estable.
  const disponibles = Object.values(mundos).flatMap((c) =>
    c ? Object.entries(c.palabras).sort(([a], [b]) => a.localeCompare(b, 'es')).map(([, p]) => p.img) : [],
  );
  const huecos = Object.values(mundos).reduce((n, c) => n + (c ? c.niveles.length * 3 : 0), 0);
  const ganadas = Math.min(progreso.totalEstrellas, huecos);

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-crema px-6 pb-10 pt-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navegar('/')}
          aria-label="Volver al mapa"
          className="flex size-16 items-center justify-center rounded-full bg-white text-mar shadow"
        >
          <IconoFlechaAtras className="size-9" />
        </button>
        <span className="flex items-center gap-2 font-sans text-3xl font-bold text-sol">
          <IconoEstrella className="size-10" /> {progreso.totalEstrellas}
        </span>
      </div>

      {progreso.pegatinas.length > 0 && (
        <section className="mt-6 flex flex-wrap gap-5">
          {progreso.pegatinas.map((p, i) => (
            <motion.div
              key={p.palabra}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: i % 2 ? 4 : -4 }}
              className="flex flex-col items-center rounded-3xl bg-white p-3 shadow-lg ring-4 ring-sol"
            >
              <Pictograma id={p.img} tamano={120} />
              <span className="texto-lectura text-[40px] font-bold text-sol">{p.palabra}</span>
            </motion.div>
          ))}
        </section>
      )}

      <section className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
        {Array.from({ length: huecos }, (_, i) => {
          const img = disponibles.length ? disponibles[i % disponibles.length] : undefined;
          return i < ganadas ? (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: Math.min(i, 20) * 0.03 }}
              className="flex aspect-square items-center justify-center rounded-3xl bg-white shadow-md"
            >
              <Pictograma id={img} tamano={90} />
            </motion.div>
          ) : (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-3xl border-4 border-dashed border-arena font-sans text-5xl font-bold text-arena"
            >
              ?
            </div>
          );
        })}
      </section>
    </main>
  );
}
