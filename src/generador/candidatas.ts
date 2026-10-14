/**
 * Filtro de palabras candidatas: frecuentes + con pictograma + decodificables.
 */
import { mundoDePalabra } from '../lib/clasificador.ts';
import { silabear } from '../lib/silabas.ts';
import type { InfoPictograma } from './fuentes.ts';

export interface Candidata {
  texto: string;
  silabas: string[];
  mundo: number;
  img: number;
  /** Posición en el ranking de frecuencia (1 = la más frecuente). */
  rango: number;
  /** false si en ARASAAC solo aparece como nombre propio (sol, luna… o madrid). */
  comun: boolean;
}

export const MAX_LETRAS = 7;
const SOLO_LETRAS = /^[a-záéíóúüñ]+$/;

/** Todas las candidatas de todos los mundos, ordenadas por frecuencia. */
export function construirCandidatas(
  frecuencias: ReadonlyMap<string, number>,
  pictogramas: ReadonlyMap<string, InfoPictograma>,
): Candidata[] {
  const resultado: Candidata[] = [];

  for (const [texto, rango] of frecuencias) {
    if (!SOLO_LETRAS.test(texto) || [...texto].length > MAX_LETRAS) continue;
    const picto = pictogramas.get(texto);
    if (!picto) continue;
    const mundo = mundoDePalabra(texto);
    if (mundo === null) continue;
    resultado.push({ texto, silabas: silabear(texto), mundo, img: picto.id, rango, comun: picto.comun });
  }

  return resultado.sort((a, b) => a.rango - b.rango);
}

/** Cuántas candidatas hay en cada mundo (comunes / total). */
export function resumenPorMundo(candidatas: readonly Candidata[]): Record<number, { comunes: number; total: number }> {
  const resumen: Record<number, { comunes: number; total: number }> = {};
  for (const c of candidatas) {
    const r = (resumen[c.mundo] ??= { comunes: 0, total: 0 });
    r.total++;
    if (c.comun) r.comunes++;
  }
  return resumen;
}
