/**
 * Minijuego "Letra intrusa": se inserta una consonante de más en una palabra
 * (pato → plato) y la niña debe reventar la que sobra.
 */
import { esVocal, normalizar, tokenizar } from './silabas.ts';

/**
 * Escalón de dificultad de una intrusa, de más fácil a más difícil:
 *  - muy-distinta: no se parece a ninguna letra de la palabra (pato + m → pamto)
 *  - normal: se parece a alguna (pato + l → palto, l se parece a t)
 *  - palabra-real: el resultado existe (pato + l → plato)
 *  - espejo: es el espejo de una letra de la palabra (dedo + b → bdedo)
 */
export type DificultadIntrusa = 'muy-distinta' | 'normal' | 'palabra-real' | 'espejo';

export interface CandidataIntrusa {
  /** Palabra con la letra de más: "plato". */
  texto: string;
  /** Letra insertada: "l". */
  letra: string;
  /** Posición (en caracteres) de la letra insertada. */
  posicion: number;
  esPalabraReal: boolean;
  dificultad: DificultadIntrusa;
}

const ESPEJO: Readonly<Record<string, string>> = { b: 'd', d: 'b', p: 'q', q: 'p' };

/** Familias de letras que se confunden a la vista en minúscula de imprenta. */
const PARECIDAS: readonly (readonly string[])[] = [
  ['b', 'd', 'p', 'q', 'g'],
  ['m', 'n', 'ñ', 'u', 'h', 'r'],
  ['l', 't', 'f', 'i', 'j', 'k'],
  ['c', 'e', 'o', 'a', 's', 'z'],
  ['v', 'y', 'w', 'x'],
];

/** Pares que, si se juntan, crean un dígrafo y cambian la lectura (c+h → ch). */
const CREA_DIGRAFO = new Set(['ch', 'll', 'rr']);

function seParecen(a: string, b: string): boolean {
  return PARECIDAS.some((familia) => familia.includes(a) && familia.includes(b));
}

function clasificar(letra: string, palabra: string, esReal: boolean): DificultadIntrusa {
  if (esReal) return 'palabra-real';
  const letras = [...palabra];
  if (letras.some((l) => ESPEJO[l] === letra)) return 'espejo';
  if (letras.some((l) => seParecen(l, letra))) return 'normal';
  return 'muy-distinta';
}

/**
 * Todas las formas de meter UNA letra de más en la palabra.
 * Normalmente consonantes; también vocales, que necesita la "palabra secreta".
 *
 * - Solo se inserta entre grafemas (nunca dentro de "ch", "qu"…).
 * - Se descarta repetir la letra vecina (ppato) y crear dígrafos (c+h, l+l, r+r).
 * - Se descarta "q", que no puede ir sin "u".
 * - Orden: primero las que forman palabra real del diccionario, luego las inventadas.
 *
 * @param letrasPermitidas letras sueltas que puede usar (las del mundo de la niña)
 * @param diccionario palabras reales conocidas (en minúscula)
 */
export function generarIntrusas(
  palabra: string,
  letrasPermitidas: readonly string[],
  diccionario: ReadonlySet<string>,
): CandidataIntrusa[] {
  const base = normalizar(palabra);

  // Posiciones válidas: los límites entre grafemas (incluidos el inicio y el final).
  const limites = [0];
  let acumulado = 0;
  for (const t of tokenizar(base)) {
    acumulado += t.texto.length;
    limites.push(acumulado);
  }

  const letras = letrasPermitidas.filter((c) => c.length === 1 && c !== 'q');
  const vistas = new Set<string>();
  const candidatas: CandidataIntrusa[] = [];

  for (const posicion of limites) {
    const antes = base.charAt(posicion - 1);
    const despues = base.charAt(posicion);

    for (const letra of letras) {
      if (letra === antes || letra === despues) continue;
      // Una vocal junto a otra formaría un diptongo y se leería distinto (pato → paeto):
      // solo se mete entre consonantes o en un extremo junto a consonante (pato → epato).
      if (esVocal(letra) && (esVocal(antes) || esVocal(despues))) continue;
      if (CREA_DIGRAFO.has(antes + letra) || CREA_DIGRAFO.has(letra + despues)) continue;

      const texto = base.slice(0, posicion) + letra + base.slice(posicion);
      if (vistas.has(texto)) continue;
      vistas.add(texto);

      const esPalabraReal = diccionario.has(texto);
      candidatas.push({
        texto,
        letra,
        posicion,
        esPalabraReal,
        dificultad: clasificar(letra, base, esPalabraReal),
      });
    }
  }

  // sort es estable: dentro de cada grupo se mantiene el orden por posición.
  return candidatas.sort((a, b) => Number(b.esPalabraReal) - Number(a.esPalabraReal));
}

/**
 * Corrección del juego: la respuesta es buena si al quitar la letra tocada
 * queda la palabra objetivo. Con letras repetidas, cualquiera de las dos vale.
 */
export function esRespuestaCorrecta(conIntrusa: string, indiceTocado: number, objetivo: string): boolean {
  const s = normalizar(conIntrusa);
  if (indiceTocado < 0 || indiceTocado >= s.length) return false;
  return s.slice(0, indiceTocado) + s.slice(indiceTocado + 1) === normalizar(objetivo);
}
