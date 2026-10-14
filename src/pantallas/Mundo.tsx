/**
 * Un mundo: sus niveles como paradas de un camino, con las estrellas ganadas.
 * Un nivel se abre al conseguir al menos una estrella en el anterior.
 */
import { motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { MUNDOS } from '../lib/clasificador.ts';
import { nivelDesbloqueado } from '../lib/progreso.ts';
import { esRepaso } from '../generador/repaso.ts';
import { useContenido, useProgreso } from '../datos/hooks.ts';
import { useDispositivo } from '../sesion/SesionNina.tsx';
import Cargando from '../componentes/Cargando.tsx';
import { ICONO_MECANICA, IconoCandado, IconoEstrella, IconoFlechaAtras } from '../componentes/Iconos.tsx';
import PuertaParental from '../componentes/PuertaParental.tsx';
import { JUEGOS_PROFE } from './JugarProfe.tsx';

export default function Mundo() {
  const { mundo: texto } = useParams();
  const mundo = Number(texto);
  const navegar = useNavigate();
  const sesion = useDispositivo();
  const estado = useContenido(mundo);
  const progreso = useProgreso(sesion?.dispositivo.studentId);

  if (!sesion) return <Navigate to="/" replace />;
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'vacio') return <Navigate to="/" replace />;

  const niveles = estado.datos.niveles;
  const ids = niveles.map((n) => n.id);
  const nombre = MUNDOS.find((m) => m.n === mundo)?.nombre ?? '';
  // Dos filas en zigzag para que quepan 8 paradas en horizontal.
  const posicion = (i: number) => ({
    x: 10 + (i * 80) / Math.max(1, niveles.length - 1),
    y: i % 2 === 0 ? 62 : 34,
  });

  return (
    <main className="relative h-full overflow-hidden bg-gradient-to-b from-crema to-arena">
      <div className="flex items-center gap-4 px-4 pt-3">
        <button
          type="button"
          onClick={() => navegar('/')}
          aria-label="Volver al mapa"
          className="flex size-16 items-center justify-center rounded-full bg-white text-mar shadow"
        >
          <IconoFlechaAtras className="size-9" />
        </button>
        <h1 className="font-sans text-2xl font-bold text-mar-oscuro/80">{nombre}</h1>
      </div>

      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          d={niveles.map((_, i) => `${i ? 'L' : 'M'} ${posicion(i).x * 10} ${posicion(i).y * 6}`).join(' ')}
          fill="none"
          stroke="#e7d5b0"
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {niveles.map((nivel, i) => {
        // Los repasos que crea el tutor están siempre abiertos.
        const abierto = esRepaso(nivel.id) || nivelDesbloqueado(progreso, ids, i);
        const estrellas = progreso.mejores.get(nivel.id)?.estrellas ?? 0;
        const Icono = ICONO_MECANICA[nivel.mecanica];
        const { x, y } = posicion(i);
        return (
          <motion.button
            key={nivel.id}
            type="button"
            disabled={!abierto}
            onClick={() => navegar(`/jugar/${mundo}/${nivel.id}`)}
            aria-label={`${nivel.titulo}${abierto ? '' : ' (cerrado)'}`}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={abierto ? { scale: 0.92 } : undefined}
            transition={{ delay: i * 0.05 }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span
              className={`flex size-28 items-center justify-center rounded-full border-[6px] shadow-lg ${
                abierto ? 'border-white bg-mar text-white' : 'border-white/70 bg-tinta/20 text-white/80'
              }`}
            >
              {abierto ? <Icono className="size-14" /> : <IconoCandado className="size-10" />}
            </span>
            <span className="flex gap-0.5">
              {[1, 2, 3].map((n) => (
                <IconoEstrella key={n} llena={n <= estrellas} className={`size-7 ${n <= estrellas ? 'text-sol' : 'text-tinta/20'}`} />
              ))}
            </span>
          </motion.button>
        );
      })}

      {/* Solo en tutoría: juegos para jugar con el profe */}
      {sesion.dispositivo.contexto === 'tutoria' && (
        <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-3xl bg-white/85 px-4 py-3 shadow-lg">
          <span className="mr-1 font-sans text-lg font-bold text-mar-oscuro">Con el profe</span>
          {JUEGOS_PROFE.map(({ juego, titulo }) => {
            const Icono = ICONO_MECANICA[juego];
            const estrellas = progreso.mejores.get(`m${mundo}-profe-${juego}`)?.estrellas ?? 0;
            return (
              <motion.button
                key={juego}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => navegar(`/profe/${mundo}/${juego}`)}
                aria-label={titulo}
                className="relative flex size-20 items-center justify-center rounded-full bg-sol text-white shadow"
              >
                <Icono className="size-11" />
                {estrellas > 0 && (
                  <span className="absolute -bottom-1 -right-1 flex items-center rounded-full bg-white px-1.5 text-sm font-bold text-sol shadow">
                    {estrellas}★
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <PuertaParental
        className="absolute bottom-4 left-4"
        onAbrir={() => navegar('/adulto', { state: { puerta: true } })}
      />
    </main>
  );
}
