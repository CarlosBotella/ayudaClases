import { AnimatePresence, motion } from 'framer-motion';

const COLORES = ['#f6b93b', '#ffd86b', '#2f8f83', '#f8c291', '#ffffff'];
const RAYOS = 12;

/**
 * Estallido de destellos. Cada vez que cambia `disparo` (y es > 0), estalla.
 * Se coloca dentro de un contenedor con position: relative.
 */
export default function Destellos({ disparo, radio = 110 }: { disparo: number; radio?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <AnimatePresence>
        {disparo > 0 && (
          <motion.div key={disparo} className="absolute" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.6, duration: 0.2 }}>
            {Array.from({ length: RAYOS }, (_, i) => {
              const angulo = (i / RAYOS) * Math.PI * 2;
              const distancia = radio * (0.7 + (i % 3) * 0.15);
              return (
                <motion.span
                  key={i}
                  className="absolute block rounded-full"
                  style={{
                    width: i % 2 ? 14 : 10,
                    height: i % 2 ? 14 : 10,
                    background: COLORES[i % COLORES.length],
                    left: -6,
                    top: -6,
                    boxShadow: '0 0 8px rgba(246,185,59,.8)',
                  }}
                  initial={{ x: 0, y: 0, scale: 0.4 }}
                  animate={{ x: Math.cos(angulo) * distancia, y: Math.sin(angulo) * distancia, scale: [0.4, 1.3, 0.2] }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
