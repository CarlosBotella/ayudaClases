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
  /** true si es algo concreto y dibujable (animal, comida, objeto…): se marca por defecto. */
  concreta: boolean;
}

export const MAX_LETRAS = 7;
const SOLO_LETRAS = /^[a-záéíóúüñ]+$/;

/** Pronombres, artículos y similares que ARASAAC trata como nombres propios. */
const PALABRAS_FUNCIONALES = new Set([
  'la', 'lo', 'le', 'las', 'los', 'les', 'el', 'un', 'una', 'me', 'te', 'se', 'nos', 'os',
  'yo', 'tú', 'él', 'ella', 'ellos', 'ellas', 'mi', 'mí', 'tu', 'ti', 'su', 'sí', 'usted',
  'este', 'esta', 'ese', 'esa', 'conmigo', 'contigo', 'alguien', 'mas', 'ame',
]);

/**
 * Palabras con pictograma "limpio" que igualmente no son para una niña de 7 años.
 * (El filtro por temas de ARASAAC ya quita la mayoría; esta lista remata.)
 */
export const PALABRAS_EXCLUIDAS = new Set([
  'cárcel', 'prisión', 'preso', 'presa', 'cerveza', 'vino', 'bar', 'pistola', 'arma', 'bala', 'sangre',
  'culo', 'pipí', 'caca', 'pedo', 'tumba', 'muerto', 'droga', 'drogas', 'cigarro', 'ladrón',
  'diablo', 'infierno', 'cuchillo', 'navaja', 'bomba', 'veneno', 'herida', 'cadáver', 'borracho',
  'abogado', 'policía', 'novio', 'novia', 'beso', 'boda', 'esposa', 'marido', 'fuerte', 'formas',
]);

/** ¿Es el plural de un nombre común que ya tiene pictograma? (hombres → hombre, flores → flor, veces → vez) */
export function esPluralDeOtra(texto: string, pictogramas: ReadonlyMap<string, InfoPictograma>): boolean {
  const comun = (w: string) => pictogramas.get(w)?.comun === true;
  if (texto.endsWith('ces') && comun(texto.slice(0, -3) + 'z')) return true;
  if (texto.endsWith('es') && comun(texto.slice(0, -2))) return true;
  return texto.endsWith('s') && comun(texto.slice(0, -1));
}

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
    if (PALABRAS_FUNCIONALES.has(texto) || PALABRAS_EXCLUIDAS.has(texto)) continue;
    if (esPluralDeOtra(texto, pictogramas)) continue;
    const mundo = mundoDePalabra(texto);
    if (mundo === null) continue;
    resultado.push({
      texto,
      silabas: silabear(texto),
      mundo,
      img: picto.id,
      rango,
      comun: picto.comun,
      concreta: picto.comun && picto.concreta,
    });
  }

  return resultado.sort((a, b) => a.rango - b.rango);
}

export interface ResumenMundo {
  /** Concretas y dibujables: las que se marcan por defecto. */
  concretas: number;
  /** Nombres comunes (incluye las concretas). */
  comunes: number;
  total: number;
}

/** Cuántas candidatas hay en cada mundo. */
export function resumenPorMundo(candidatas: readonly Candidata[]): Record<number, ResumenMundo> {
  const resumen: Record<number, ResumenMundo> = {};
  for (const c of candidatas) {
    const r = (resumen[c.mundo] ??= { concretas: 0, comunes: 0, total: 0 });
    r.total++;
    if (c.comun) r.comunes++;
    if (c.concreta) r.concretas++;
  }
  return resumen;
}
