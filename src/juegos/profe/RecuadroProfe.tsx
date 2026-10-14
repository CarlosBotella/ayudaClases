/**
 * Recuadro para el profe con lo que tiene que leer o dictar.
 * El texto solo se ve MIENTRAS se mantiene pulsado: así la niña no lo lee antes.
 */
import { useState } from 'react';

export default function RecuadroProfe({ titulo, texto }: { titulo: string; texto: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <button
      type="button"
      onPointerDown={() => setVisible(true)}
      onPointerUp={() => setVisible(false)}
      onPointerLeave={() => setVisible(false)}
      onPointerCancel={() => setVisible(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
      className="flex min-h-20 min-w-56 flex-col items-start justify-center rounded-2xl border-2 border-dashed border-mar/40 bg-white/80 px-4 py-2 text-left font-sans"
      aria-label={`${titulo} (mantén pulsado para ver)`}
    >
      <span className="text-sm font-bold text-mar-oscuro/70">{titulo}</span>
      {visible ? (
        <span className="text-3xl font-bold text-tinta">{texto}</span>
      ) : (
        <span className="text-base text-tinta/50">mantén pulsado para ver 👁</span>
      )}
    </button>
  );
}
