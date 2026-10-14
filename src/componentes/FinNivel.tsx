/**
 * Final de un nivel: estrellas que aparecen una a una, la pegatina (si la hay)
 * y dos botones: otra vez / seguir.
 */
import { motion } from 'framer-motion';
import { IconoEstrella, IconoOtraVez, IconoPlay } from './Iconos.tsx';
import Pictograma from './Pictograma.tsx';
import Destellos from './Destellos.tsx';

export interface Final {
  estrellas: number;
  pegatina?: { palabra: string; img: number };
}

export default function FinNivel({ final, onOtraVez, onSeguir }: { final: Final; onOtraVez: () => void; onSeguir: () => void }) {
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
