/**
 * Números aleatorios con semilla (mulberry32): el mismo mundo generado dos
 * veces con la misma semilla da exactamente los mismos niveles.
 */
export interface Aleatorio {
  /** Número en [0, 1). */
  siguiente(): number;
  /** Entero en [0, max). */
  entero(max: number): number;
  /** Copia barajada (Fisher–Yates). */
  barajar<T>(lista: readonly T[]): T[];
  /** Un elemento al azar, o undefined si la lista está vacía. */
  elegir<T>(lista: readonly T[]): T | undefined;
}

export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla >>> 0;

  const siguiente = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const entero = (max: number): number => Math.floor(siguiente() * max);

  return {
    siguiente,
    entero,
    barajar<T>(lista: readonly T[]): T[] {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = entero(i + 1);
        [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
      }
      return copia;
    },
    elegir<T>(lista: readonly T[]): T | undefined {
      return lista.length === 0 ? undefined : lista[entero(lista.length)];
    },
  };
}
