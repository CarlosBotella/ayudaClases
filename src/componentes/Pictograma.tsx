import { urlPictograma } from '../generador/fuentes.ts';

/**
 * Pictograma de ARASAAC. Se pide con CORS (crossOrigin) para que el service
 * worker lo guarde en caché y se vea también sin conexión.
 */
export default function Pictograma({
  id,
  tamano,
  className = '',
}: {
  id: number | undefined;
  tamano: number;
  className?: string;
}) {
  if (!id) {
    return <div style={{ width: tamano, height: tamano }} className={`rounded-3xl bg-arena ${className}`} />;
  }
  return (
    <img
      src={urlPictograma(id)}
      alt=""
      width={tamano}
      height={tamano}
      draggable={false}
      crossOrigin="anonymous"
      decoding="async"
      className={`pointer-events-none select-none object-contain ${className}`}
      style={{ width: tamano, height: tamano }}
    />
  );
}
