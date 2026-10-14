import type { Contenido } from '../datos/esquemas.ts';
import type { Registrar } from './registro.ts';

/** Lo que cada minijuego devuelve al terminar. */
export interface ResultadoJuego {
  /** Ítems evaluados. */
  items: number;
  /** Ítems resueltos sin ningún error. */
  aciertosPrimera: number;
  /** Solo carrera. */
  pcpm?: number;
  ganaAlFantasma?: boolean;
  /** Solo intrusa: pegatina de la palabra secreta. */
  pegatina?: { palabra: string; img: number };
}

export interface PropsJuego<N> {
  nivel: N;
  contenido: Contenido;
  registrar: Registrar;
  alTerminar: (r: ResultadoJuego) => void;
  /** Avance para la barra superior (0–1). */
  alAvanzar: (fraccion: number) => void;
}

/** Errores en el mismo ítem a partir de los cuales aparece la pista. */
export const ERRORES_PARA_PISTA = 2;

/** Patrón silábico de una palabra ("CV-CCV") para el registro. */
export { patronDePalabra } from './utilidades.ts';
