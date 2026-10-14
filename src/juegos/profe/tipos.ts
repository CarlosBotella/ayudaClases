import type { Registrar } from '../registro.ts';
import type { ResultadoJuego } from '../tipos.ts';
import type { PalabraJuego } from './generar.ts';

export interface PropsJuegoProfe {
  mundo: number;
  /** Escalón de reto (1–5) con el que se juega esta ronda. */
  escalon: number;
  palabras: PalabraJuego[];
  registrar: Registrar;
  alTerminar: (r: ResultadoJuego) => void;
  alAvanzar: (fraccion: number) => void;
}
