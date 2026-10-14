import type { EscenaDatos } from '../datos/esquemas.ts';
import Pictograma from './Pictograma.tsx';

/**
 * Dibuja una escena de pictogramas: tamaños (×0.5 / ×1.6), copias (dos/tres)
 * o parejas. La caja tiene tamaño fijo para que "grande" y "pequeño" se noten.
 */
export default function EscenaVista({
  escena,
  imagenes,
  base = 120,
}: {
  escena: EscenaDatos;
  /** palabra → id de pictograma */
  imagenes: Readonly<Record<string, { img: number } | undefined>>;
  base?: number;
}) {
  const copiasTotales = escena.elementos.reduce((n, e) => n + e.copias, 0);
  // Con muchas copias, cada dibujo un poco más pequeño para que quepan.
  const ajuste = copiasTotales > 2 ? 0.75 : 1;

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      style={{ minHeight: base * 1.7, minWidth: base * 1.7 }}
    >
      {escena.elementos.flatMap((e, i) =>
        Array.from({ length: e.copias }, (_, c) => (
          <Pictograma key={`${i}-${c}`} id={imagenes[e.palabra]?.img} tamano={Math.round(base * e.escala * ajuste)} />
        )),
      )}
    </div>
  );
}
