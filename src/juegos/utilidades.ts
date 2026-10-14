import { analizarSilabas } from '../lib/silabas.ts';

/** Patrón silábico de una palabra para el registro: plato → "CCV-CV". */
export function patronDePalabra(palabra: string): string {
  return analizarSilabas(palabra)
    .map((s) => s.patron)
    .join('-');
}

/** Baraja con Math.random (para la interfaz; el generador usa semilla). */
export function barajar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
}

/** Espera unos milisegundos (para encadenar animaciones). */
export const esperar = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
