import { motion } from 'framer-motion';

/** Indicador de carga: tres burbujas que laten (sin texto). */
export default function Cargando() {
  return (
    <div className="flex h-full items-center justify-center gap-4" role="status" aria-label="Cargando">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-8 rounded-full bg-mar"
          animate={{ y: [0, -24, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
