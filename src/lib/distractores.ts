/**
 * Generación de distractores por reglas, cada uno etiquetado con el TIPO de
 * error que representa. Así, cuando la niña elige un distractor, el panel
 * puede contar errores de inversión, espejo, sonoridad u omisión.
 */
import { analizarSilabas, patronDe, tokenizar, type Token } from './silabas.ts';

export type TipoError =
  | 'inversion' // bla → bal, la → al
  | 'espejo' // b ↔ d, p ↔ q
  | 'sonoridad' // p ↔ b, t ↔ d, c ↔ g
  | 'omision' // bla → ba
  | 'intrusa' // letra de más
  | 'sustitucion' // otra letra cualquiera (ma → me, pa → sa)
  | 'comprension'; // elegir la escena equivocada en el detective

export interface Distractor {
  texto: string;
  tipo: TipoError;
}

const ESPEJO: Readonly<Record<string, string>> = { b: 'd', d: 'b', p: 'q', q: 'p' };
const SONORIDAD_SIMPLE: Readonly<Record<string, string>> = { p: 'b', b: 'p', t: 'd', d: 't' };
const ANTE_E_I = new Set(['e', 'i', 'é', 'í']);

const unir = (tokens: readonly Token[]): string => tokens.map((t) => t.texto).join('');

/** Añade sin repetir y nunca igual al original. */
function anadir(lista: Distractor[], original: string, d: Distractor): void {
  if (d.texto === original || d.texto.length === 0) return;
  if (lista.some((x) => x.texto === d.texto)) return;
  lista.push(d);
}

/** Inversiones: CCV → CVC (bla → bal); CV ↔ VC (la ↔ al). */
function inversiones(tokens: readonly Token[], patron: string): string[] {
  const [a, b, c] = tokens;
  if (patron === 'CCV' && a && b && c) return [a.texto + c.texto + b.texto];
  if ((patron === 'CV' || patron === 'VC') && a && b) {
    // "que" → "equ" no tiene sentido: qu, gu y gü solo existen delante de vocal.
    const consonante = patron === 'CV' ? a : b;
    if (['qu', 'gu', 'gü'].includes(consonante.texto)) return [];
    return [b.texto + a.texto];
  }
  return [];
}

/** Omisión de la segunda consonante de la trabada: bla → ba, tren → ten. */
function omisiones(tokens: readonly Token[], patron: string): string[] {
  if (patron !== 'CCV' && patron !== 'CCVC') return [];
  return [unir(tokens.filter((_, i) => i !== 1))];
}

/** Cambios en espejo letra a letra (una sustitución cada vez). */
function espejos(texto: string): string[] {
  const resultado: string[] = [];
  for (let i = 0; i < texto.length; i++) {
    const cambio = ESPEJO[texto.charAt(i)];
    if (cambio) resultado.push(texto.slice(0, i) + cambio + texto.slice(i + 1));
  }
  return resultado;
}

/**
 * Cambios de sonoridad respetando la ortografía:
 * p↔b, t↔d; c↔g solo donde suenan /k/ y /g/ (ca, co, cu, final) y qu↔gu ante e/i.
 */
function sonoridades(tokens: readonly Token[]): string[] {
  const resultado: string[] = [];
  tokens.forEach((token, i) => {
    const siguiente = tokens[i + 1]?.texto.charAt(0) ?? '';
    const anteEI = ANTE_E_I.has(siguiente);
    let cambio: string | undefined;

    if (token.texto in SONORIDAD_SIMPLE) cambio = SONORIDAD_SIMPLE[token.texto];
    else if (token.texto === 'c' && !anteEI) cambio = 'g';
    else if (token.texto === 'g' && !anteEI) cambio = 'c';
    else if (token.texto === 'qu') cambio = 'gu';
    else if (token.texto === 'gu') cambio = 'qu';

    if (cambio) {
      const copia = tokens.map((t) => t.texto);
      copia[i] = cambio;
      resultado.push(copia.join(''));
    }
  });
  return resultado;
}

/**
 * Distractores de una sílaba suelta.
 * distractoresSilaba('bla') → bal (inversión), ba (omisión), dla (espejo), pla (sonoridad)
 */
export function distractoresSilaba(silaba: string): Distractor[] {
  const tokens = tokenizar(silaba);
  const patron = patronDe(silaba);
  const lista: Distractor[] = [];

  inversiones(tokens, patron).forEach((texto) => anadir(lista, silaba, { texto, tipo: 'inversion' }));
  omisiones(tokens, patron).forEach((texto) => anadir(lista, silaba, { texto, tipo: 'omision' }));
  espejos(silaba).forEach((texto) => anadir(lista, silaba, { texto, tipo: 'espejo' }));
  sonoridades(tokens).forEach((texto) => anadir(lista, silaba, { texto, tipo: 'sonoridad' }));

  return lista;
}

/**
 * Distractores de una palabra: aplica las reglas de sílaba a cada una de sus
 * sílabas, dejando el resto igual. distractoresPalabra('plato') → palto, pato, qlato, blato…
 */
export function distractoresPalabra(palabra: string): Distractor[] {
  const silabas = analizarSilabas(palabra).map((s) => s.texto);
  const original = silabas.join('');
  const lista: Distractor[] = [];

  silabas.forEach((silaba, i) => {
    for (const d of distractoresSilaba(silaba)) {
      const texto = [...silabas.slice(0, i), d.texto, ...silabas.slice(i + 1)].join('');
      anadir(lista, original, { texto, tipo: d.tipo });
    }
  });

  return lista;
}

/** Filtra distractores por tipo (útil para la progresión: visuales → fonológicos). */
export function deTipo(lista: readonly Distractor[], ...tipos: TipoError[]): Distractor[] {
  return lista.filter((d) => tipos.includes(d.tipo));
}
