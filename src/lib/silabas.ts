/**
 * Silabeador del español escrito, pensado para primeros lectores.
 *
 * Trabaja sobre la ESCRITURA (no sobre la fonética): divide como se enseña en
 * el cole (pe·rro, ca·lle, que·so) y etiqueta cada sílaba con un patrón
 * (CV, CCV, VC, CVC…) que usa el clasificador de mundos.
 *
 * Reglas:
 *  1. Tokens: "ch", "ll", "rr", "qu"/"gu" ante e/i y "gü" cuentan como UNA consonante.
 *     "y" es consonante si va delante de vocal ("yo", "reyes") y vocal si no ("rey", "y").
 *  2. Núcleos: vocales seguidas forman diptongo salvo que sean dos "fuertes"
 *     (a, e, o y las tildadas á é ó í ú), que forman hiato (le·er, dí·a, pa·ís).
 *  3. Consonantes entre dos núcleos:
 *     - 0 o 1 → van con la sílaba siguiente (ca·sa, a·ho·ra).
 *     - 2 o más → si las dos últimas son trabada inseparable (pl, br, tr…) van
 *       juntas a la siguiente (ha·blar, obs·truir); si no, solo la última (ár·bol, ins·tan·te).
 */

export type TipoToken = 'C' | 'V';

export interface Token {
  /** Letras tal y como aparecen en la palabra (en minúscula). */
  texto: string;
  tipo: TipoToken;
}

export interface Silaba {
  texto: string;
  /** Patrón: C por consonante (o dígrafo) y una sola V por grupo vocálico. */
  patron: string;
  tokens: Token[];
}

const VOCALES = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü']);
/** Vocales que, juntas, forman hiato. Las débiles tildadas (í, ú) cuentan como fuertes. */
const FUERTES = new Set(['a', 'e', 'o', 'á', 'é', 'ó', 'í', 'ú']);
const ANTE_E_I = new Set(['e', 'i', 'é', 'í']);
const DIGRAFOS = new Set(['ch', 'll', 'rr']);

/** Grupos consonánticos que nunca se separan (sílabas trabadas). */
export const TRABADAS: ReadonlySet<string> = new Set([
  'pl', 'bl', 'cl', 'fl', 'gl',
  'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr',
]);

/** Minúsculas y forma Unicode compuesta (á como un solo carácter). */
export function normalizar(palabra: string): string {
  return palabra.normalize('NFC').toLowerCase().trim();
}

export function esVocal(letra: string | undefined): boolean {
  return letra !== undefined && VOCALES.has(letra);
}

/** Divide una palabra en consonantes (con sus dígrafos) y vocales. */
export function tokenizar(palabra: string): Token[] {
  const s = normalizar(palabra);
  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    const c = s.charAt(i);
    const sig = s.charAt(i + 1);
    const sig2 = s.charAt(i + 2);

    // ch, ll, rr
    if (DIGRAFOS.has(c + sig)) {
      tokens.push({ texto: c + sig, tipo: 'C' });
      i += 2;
      continue;
    }
    // qu / gu ante e, i: la u no suena, forma parte de la consonante.
    if ((c === 'q' || c === 'g') && sig === 'u' && ANTE_E_I.has(sig2)) {
      tokens.push({ texto: c + 'u', tipo: 'C' });
      i += 2;
      continue;
    }
    // gü (pingüino, cigüeña): se enseña como un bloque.
    if (c === 'g' && sig === 'ü') {
      tokens.push({ texto: 'gü', tipo: 'C' });
      i += 2;
      continue;
    }
    // y: consonante ante vocal; vocal en el resto de casos (rey, hoy, y).
    if (c === 'y') {
      tokens.push({ texto: 'y', tipo: esVocal(sig) ? 'C' : 'V' });
      i += 1;
      continue;
    }

    tokens.push({ texto: c, tipo: esVocal(c) ? 'V' : 'C' });
    i += 1;
  }

  return tokens;
}

/** ¿Una vocal (o "y" vocálica) es fuerte a efectos de hiato? */
function esFuerte(token: Token): boolean {
  return FUERTES.has(token.texto);
}

type Grupo = { tipo: 'C' | 'N'; tokens: Token[] };

/**
 * Agrupa los tokens en bloques alternos de consonantes (C) y núcleos (N).
 * Un hiato produce dos núcleos seguidos sin consonantes en medio.
 */
function agrupar(tokens: Token[]): Grupo[] {
  const grupos: Grupo[] = [];

  for (const token of tokens) {
    const ultimo = grupos[grupos.length - 1];

    if (token.tipo === 'C') {
      if (ultimo?.tipo === 'C') ultimo.tokens.push(token);
      else grupos.push({ tipo: 'C', tokens: [token] });
      continue;
    }

    // Vocal: se une al núcleo anterior salvo hiato (dos fuertes seguidas).
    if (ultimo?.tipo === 'N') {
      const anterior = ultimo.tokens[ultimo.tokens.length - 1];
      if (anterior && esFuerte(anterior) && esFuerte(token)) {
        grupos.push({ tipo: 'N', tokens: [token] });
      } else {
        ultimo.tokens.push(token);
      }
    } else {
      grupos.push({ tipo: 'N', tokens: [token] });
    }
  }

  return grupos;
}

/** Patrón de una lista de tokens: C por consonante, una V por cada grupo de vocales. */
function patronDeTokens(tokens: Token[]): string {
  let patron = '';
  for (const t of tokens) {
    if (t.tipo === 'V' && patron.endsWith('V')) continue;
    patron += t.tipo;
  }
  return patron;
}

function crearSilaba(tokens: Token[]): Silaba {
  return {
    texto: tokens.map((t) => t.texto).join(''),
    patron: patronDeTokens(tokens),
    tokens,
  };
}

/**
 * Analiza una palabra y devuelve sus sílabas con patrón y tokens.
 * Si la palabra no tiene ninguna vocal, devuelve [] (no es silabeable).
 */
export function analizarSilabas(palabra: string): Silaba[] {
  const grupos = agrupar(tokenizar(palabra));
  if (!grupos.some((g) => g.tipo === 'N')) return [];

  const silabas: Token[][] = [];
  let actual: Token[] = [];
  let pendientes: Token[] = []; // consonantes vistas desde el último núcleo
  let hayNucleo = false;

  for (const grupo of grupos) {
    if (grupo.tipo === 'C') {
      pendientes = pendientes.concat(grupo.tokens);
      continue;
    }

    if (!hayNucleo) {
      // Primer núcleo: las consonantes iniciales son su ataque (ha·blar → h).
      actual = [...pendientes, ...grupo.tokens];
      hayNucleo = true;
    } else {
      const n = pendientes.length;
      let corte: number; // índice desde el que las consonantes pasan a la sílaba siguiente
      if (n <= 1) {
        corte = 0;
      } else {
        const ultimas = pendientes[n - 2]!.texto + pendientes[n - 1]!.texto;
        corte = TRABADAS.has(ultimas) ? n - 2 : n - 1;
      }
      actual.push(...pendientes.slice(0, corte)); // coda de la sílaba actual
      silabas.push(actual);
      actual = [...pendientes.slice(corte), ...grupo.tokens];
    }
    pendientes = [];
  }

  // Consonantes finales: coda de la última sílaba (sol, árbol).
  actual.push(...pendientes);
  silabas.push(actual);

  return silabas.map(crearSilaba);
}

/** Atajo: solo el texto de cada sílaba. silabear('plato') → ['pla', 'to'] */
export function silabear(palabra: string): string[] {
  return analizarSilabas(palabra).map((s) => s.texto);
}

/** Patrón de una sílaba suelta: 'pla' → 'CCV', 'sol' → 'CVC', 'que' → 'CV'. */
export function patronDe(silaba: string): string {
  return patronDeTokens(tokenizar(silaba));
}

const TILDADAS = /[áéíóú]/;

/**
 * Índice de la sílaba tónica según las reglas de acentuación:
 * con tilde → esa; sin tilde → llana si acaba en vocal, n o s; aguda en otro caso.
 */
export function silabaTonica(palabra: string): number {
  const silabas = silabear(palabra);
  if (silabas.length <= 1) return 0;

  const conTilde = silabas.findIndex((s) => TILDADAS.test(s));
  if (conTilde >= 0) return conTilde;

  const final = normalizar(palabra).slice(-1);
  const llana = 'aeiouns'.includes(final);
  return llana ? silabas.length - 2 : silabas.length - 1;
}
