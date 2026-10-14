/**
 * Frases por plantilla, siempre dibujables con pictogramas:
 *  - tamaño:   "el pato es pequeño" → pictograma escalado ×0.5 (o ×1.6 si es grande)
 *  - cantidad: "dos patos"          → 2 copias del pictograma
 *  - pareja:   "pato y mesa"        → los dos pictogramas
 * Cada frase lleva su escena correcta y escenas distractoras para el Detective.
 */
import { mundoDeFrase } from './clasificador.ts';
import { normalizar, silabaTonica } from './silabas.ts';

export type Genero = 'm' | 'f';
export type Plantilla = 'nombre' | 'tamano' | 'cantidad' | 'pareja';

export interface ElementoEscena {
  /** Sustantivo en singular (clave para buscar su pictograma). */
  palabra: string;
  /** 1 = tamaño normal. */
  escala: number;
  copias: number;
}

export interface Escena {
  elementos: ElementoEscena[];
}

export interface Frase {
  texto: string;
  /** Todas las palabras de la frase, para clasificarla. */
  palabras: string[];
  plantilla: Plantilla;
  /** Mundo de la frase (máximo de sus palabras) o null si no es decodificable. */
  mundo: number | null;
  escena: Escena;
  distractoras: Escena[];
}

export const ESCALA_PEQUENO = 0.5;
export const ESCALA_GRANDE = 1.6;

/** Femeninos acabados en -o y masculinos acabados en -a (la regla falla con ellos). */
const FEMENINOS_EN_O = new Set(['mano', 'foto', 'moto', 'radio', 'seo', 'libido']);
const MASCULINOS_EN_A = new Set([
  'día', 'mapa', 'planeta', 'problema', 'tema', 'poema', 'idioma', 'sistema',
  'programa', 'clima', 'pijama', 'tranvía', 'cometa', 'sofá', 'papá', 'drama',
  'esquema', 'fantasma', 'telegrama', 'crucigrama', 'diploma', 'dilema',
]);

/**
 * Género y artículo por terminación: -a → la, -o → el.
 * Devuelve null (frase descartada) si la palabra no acaba en -a/-o, está en las
 * listas de excepciones o es femenina con "a" tónica inicial ("el agua" confunde).
 */
export function generoYArticulo(sustantivo: string): { genero: Genero; articulo: 'el' | 'la' } | null {
  const s = normalizar(sustantivo);
  if (FEMENINOS_EN_O.has(s) || MASCULINOS_EN_A.has(s)) return null;

  if (s.endsWith('o')) return { genero: 'm', articulo: 'el' };
  if (s.endsWith('a')) {
    // agua, águila, hada, hacha… llevan "el" aunque sean femeninas: mejor evitarlas.
    if (/^h?[aá]/.test(s) && silabaTonica(s) === 0) return null;
    return { genero: 'f', articulo: 'la' };
  }
  return null;
}

/** Plural: vocal → +s; consonante → +es (z → ces). */
export function plural(sustantivo: string): string {
  const s = normalizar(sustantivo);
  if (/[aeiouáéó]$/.test(s)) return s + 's';
  if (s.endsWith('z')) return s.slice(0, -1) + 'ces';
  return s + 'es';
}

function escenaSimple(palabra: string, escala = 1, copias = 1): Escena {
  return { elementos: [{ palabra, escala, copias }] };
}

function crear(palabras: string[], plantilla: Plantilla, escena: Escena, distractoras: Escena[]): Frase {
  return { texto: palabras.join(' '), palabras, plantilla, mundo: mundoDeFrase(palabras), escena, distractoras };
}

/**
 * Frases de 2 palabras para los primeros mundos: "la mesa" (femeninos) y
 * "mi oso" (cualquiera). "la" y "mi" son del Mundo 1; "el" es VC (Mundo 4).
 * Distractora: el dibujo de `cambio`.
 */
export function frasesNombre(sustantivo: string, cambio: string): Frase[] {
  const s = normalizar(sustantivo);
  const c = normalizar(cambio);
  if (s === c) return [];
  const distractoras = [escenaSimple(c)];
  const frases: Frase[] = [];

  if (generoYArticulo(s)?.articulo === 'la') {
    frases.push(crear(['la', s], 'nombre', escenaSimple(s), distractoras));
  }
  frases.push(crear(['mi', s], 'nombre', escenaSimple(s), distractoras));
  return frases;
}

/**
 * "el pato es pequeño" y "la mesa es grande".
 * Distractora: el mismo dibujo con el tamaño contrario (y, si se da, otro objeto).
 */
export function frasesTamano(sustantivo: string, otro?: string): Frase[] {
  const ga = generoYArticulo(sustantivo);
  if (!ga) return [];
  const s = normalizar(sustantivo);
  const pequeno = ga.genero === 'f' ? 'pequeña' : 'pequeño';

  const variantes: Array<[string, number, number]> = [
    [pequeno, ESCALA_PEQUENO, ESCALA_GRANDE],
    ['grande', ESCALA_GRANDE, ESCALA_PEQUENO],
  ];

  return variantes.map(([adjetivo, escala, contraria]) => {
    const distractoras = [escenaSimple(s, contraria)];
    if (otro) distractoras.push(escenaSimple(normalizar(otro), escala));
    return crear([ga.articulo, s, 'es', adjetivo], 'tamano', escenaSimple(s, escala), distractoras);
  });
}

/**
 * "dos patos" y "tres patos". Distractoras: el otro número y una sola copia.
 */
export function frasesCantidad(sustantivo: string): Frase[] {
  const s = normalizar(sustantivo);
  if (!generoYArticulo(s)) return [];
  const pl = plural(s);

  const variantes: Array<[string, number, number]> = [
    ['dos', 2, 3],
    ['tres', 3, 2],
  ];

  return variantes.map(([numero, copias, otraCantidad]) =>
    crear([numero, pl], 'cantidad', escenaSimple(s, 1, copias), [
      escenaSimple(s, 1, otraCantidad),
      escenaSimple(s, 1, 1),
    ]),
  );
}

/**
 * "pato y mesa". Distractoras: cambiar una de las dos palabras por `cambio`.
 */
export function frasePareja(a: string, b: string, cambio: string): Frase | null {
  const [x, y, z] = [a, b, cambio].map(normalizar) as [string, string, string];
  if (new Set([x, y, z]).size < 3) return null;

  const pareja = (p: string, q: string): Escena => ({
    elementos: [
      { palabra: p, escala: 1, copias: 1 },
      { palabra: q, escala: 1, copias: 1 },
    ],
  });

  return crear([x, 'y', y], 'pareja', pareja(x, y), [pareja(z, y), pareja(x, z)]);
}
