/**
 * Clasificador de palabras y frases por mundos.
 *
 * Principio de texto DECODIFICABLE: una palabra pertenece al primer mundo cuyas
 * letras (grafemas) y tipos de sílaba acumulados la admiten. Si no encaja en
 * ninguno (p. ej. "ins·tan·te", con VCC), se descarta.
 */
import { analizarSilabas } from './silabas.ts';

export interface DefMundo {
  n: number;
  nombre: string;
  /** Grafemas que se AÑADEN en este mundo. */
  grafemasNuevos: readonly string[];
  /** Patrones de sílaba que se AÑADEN en este mundo. */
  patronesNuevos: readonly string[];
}

export const MUNDOS: readonly DefMundo[] = [
  {
    n: 1,
    nombre: 'Isla de las Vocales',
    grafemasNuevos: ['a', 'e', 'i', 'o', 'u', 'm', 'p', 'l', 's'],
    patronesNuevos: ['V', 'CV'],
  },
  {
    n: 2,
    nombre: 'Bosque Directo',
    grafemasNuevos: ['t', 'd', 'n', 'f', 'b', 'v', 'ñ'],
    patronesNuevos: [],
  },
  {
    n: 3,
    nombre: 'Cueva de los Sonidos Raros',
    grafemasNuevos: ['c', 'qu', 'g', 'gu', 'gü', 'r', 'rr', 'h', 'y', 'z', 'j', 'ch', 'll', 'x', 'k'],
    patronesNuevos: [],
  },
  {
    n: 4,
    nombre: 'Río al Revés',
    grafemasNuevos: [],
    patronesNuevos: ['VC', 'CVC'],
  },
  {
    n: 5,
    nombre: 'Montaña Trabada',
    grafemasNuevos: [],
    patronesNuevos: ['CCV', 'CCVC'],
  },
];

export const NUM_MUNDOS = MUNDOS.length;

/** Grafemas y patrones permitidos en el mundo n (acumulados desde el 1). */
export function permitidosEnMundo(n: number): { grafemas: Set<string>; patrones: Set<string> } {
  const grafemas = new Set<string>();
  const patrones = new Set<string>();
  for (const m of MUNDOS) {
    if (m.n > n) break;
    m.grafemasNuevos.forEach((g) => grafemas.add(g));
    m.patronesNuevos.forEach((p) => patrones.add(p));
  }
  return { grafemas, patrones };
}

const SIN_TILDE: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };

/**
 * Grafemas de una palabra tal y como se enseñan: dígrafos como unidad
 * ("ch", "qu", "gu", "gü"…) y vocales sin tilde (la tilde no cambia la letra).
 */
export function grafemasDe(palabra: string): string[] {
  const grafemas: string[] = [];
  for (const silaba of analizarSilabas(palabra)) {
    for (const token of silaba.tokens) {
      if (token.tipo === 'C') {
        grafemas.push(token.texto);
      } else {
        for (const letra of token.texto) grafemas.push(SIN_TILDE[letra] ?? letra);
      }
    }
  }
  return grafemas;
}

/** Mundo en el que aparece una palabra por primera vez, o null si no encaja en ninguno. */
export function mundoDePalabra(palabra: string): number | null {
  const silabas = analizarSilabas(palabra);
  if (silabas.length === 0) return null;

  const grafemas = new Set(grafemasDe(palabra));
  const patrones = new Set(silabas.map((s) => s.patron));

  for (const m of MUNDOS) {
    const permitidos = permitidosEnMundo(m.n);
    const letrasOk = [...grafemas].every((g) => permitidos.grafemas.has(g));
    const patronesOk = [...patrones].every((p) => permitidos.patrones.has(p));
    if (letrasOk && patronesOk) return m.n;
  }
  return null;
}

/** Mundo de una frase: el máximo de sus palabras; null si alguna no encaja. */
export function mundoDeFrase(palabras: readonly string[]): number | null {
  let maximo = 0;
  for (const palabra of palabras) {
    const m = mundoDePalabra(palabra);
    if (m === null) return null;
    maximo = Math.max(maximo, m);
  }
  return maximo === 0 ? null : maximo;
}
