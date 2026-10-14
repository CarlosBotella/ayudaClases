/**
 * Resumen del progreso de la niña a partir de sus resultados por nivel
 * (students/{sid}/levelAttempts): mejores estrellas, pegatinas y su "fantasma".
 */
import type { IntentoNivel } from '../datos/esquemas.ts';

export interface MejorNivel {
  estrellas: number;
  /** Mejor marca de la carrera (PCPM) y cuánto tardó en esa partida. */
  pcpm?: number;
  duracionMs?: number;
}

export interface ResumenProgreso {
  mejores: Map<string, MejorNivel>;
  totalEstrellas: number;
  /** Pegatinas de palabra secreta, sin repetir, en orden de conquista. */
  pegatinas: Array<{ palabra: string; img: number }>;
}

export const PROGRESO_VACIO: ResumenProgreso = { mejores: new Map(), totalEstrellas: 0, pegatinas: [] };

/** `intentos` deben venir ordenados del más antiguo al más reciente. */
export function resumirProgreso(intentos: readonly IntentoNivel[]): ResumenProgreso {
  const mejores = new Map<string, MejorNivel>();
  const pegatinas: Array<{ palabra: string; img: number }> = [];

  for (const i of intentos) {
    const actual = mejores.get(i.nivelId) ?? { estrellas: 0 };
    const nuevo: MejorNivel = { ...actual, estrellas: Math.max(actual.estrellas, i.estrellas) };
    if (i.pcpm !== undefined && (actual.pcpm === undefined || i.pcpm > actual.pcpm)) {
      nuevo.pcpm = i.pcpm;
      nuevo.duracionMs = i.duracionMs;
    }
    mejores.set(i.nivelId, nuevo);

    if (i.pegatina && i.pegatinaImg && !pegatinas.some((p) => p.palabra === i.pegatina)) {
      pegatinas.push({ palabra: i.pegatina, img: i.pegatinaImg });
    }
  }

  let totalEstrellas = 0;
  for (const m of mejores.values()) totalEstrellas += m.estrellas;
  return { mejores, totalEstrellas, pegatinas };
}

/** Estrellas conseguidas y posibles en un mundo. */
export function estrellasDeMundo(
  resumen: ResumenProgreso,
  nivelesIds: readonly string[],
): { conseguidas: number; posibles: number } {
  let conseguidas = 0;
  for (const id of nivelesIds) conseguidas += resumen.mejores.get(id)?.estrellas ?? 0;
  return { conseguidas, posibles: nivelesIds.length * 3 };
}

/** Un nivel se abre cuando el anterior tiene al menos una estrella. */
export function nivelDesbloqueado(resumen: ResumenProgreso, nivelesIds: readonly string[], indice: number): boolean {
  if (indice <= 0) return true;
  const anterior = nivelesIds[indice - 1];
  return anterior !== undefined && (resumen.mejores.get(anterior)?.estrellas ?? 0) > 0;
}
