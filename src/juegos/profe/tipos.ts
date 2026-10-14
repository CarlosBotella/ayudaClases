import type { Registrar } from '../registro.ts';
import type { ResultadoJuego } from '../tipos.ts';
import type { PalabraJuego } from './generar.ts';

export interface PropsJuegoProfe {
  mundo: number;
  palabras: PalabraJuego[];
  registrar: Registrar;
  alTerminar: (r: ResultadoJuego) => void;
  alAvanzar: (fraccion: number) => void;
}
