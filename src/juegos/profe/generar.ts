/**
 * Rondas de los juegos "con el profe" (modo tutoría). Se generan al momento
 * con las palabras ya aprobadas del mundo: no hace falta regenerar contenido.
 */
import type { Aleatorio } from '../../lib/aleatorio.ts';
import { permitidosEnMundo } from '../../lib/clasificador.ts';
import { distractoresPalabra, type TipoError } from '../../lib/distractores.ts';
import { tokenizar } from '../../lib/silabas.ts';

export interface PalabraJuego {
  texto: string;
  silabas: string[];
  img: number;
}

// ─── ¡Pillado! ───────────────────────────────────────────────────────────────

export interface RondaPillado {
  /** Palabra escrita en pantalla. */
  palabra: string;
  /** Lo que el profe tiene que leer en voz alta. */
  leer: string;
  /** true si el profe lee MAL a propósito. */
  esError: boolean;
  tipo: TipoError | null;
}

/** Errores de lectura típicos, en orden de preferencia (los más formativos primero). */
const ERRORES_LECTURA: TipoError[] = ['inversion', 'omision', 'sonoridad', 'espejo'];

export function generarPillado(
  palabras: readonly PalabraJuego[],
  rnd: Aleatorio,
  rondas = 8,
  preferencia: readonly TipoError[] = ERRORES_LECTURA,
): RondaPillado[] {
  const elegidas = rnd.barajar(palabras.filter((p) => p.silabas.length >= 2)).slice(0, rondas);
  // Mitad bien, mitad mal, en orden aleatorio.
  const errores = rnd.barajar(elegidas.map((_, i) => i < Math.floor(elegidas.length / 2)));

  return elegidas.map((p, i) => {
    if (!errores[i]) return { palabra: p.texto, leer: p.texto, esError: false, tipo: null };
    // La "q" sola no se puede leer en voz alta: fuera.
    const opciones = distractoresPalabra(p.texto).filter((d) => !d.texto.includes('q'));
    for (const tipo of [...preferencia, ...ERRORES_LECTURA]) {
      const d = rnd.elegir(opciones.filter((o) => o.tipo === tipo));
      if (d) return { palabra: p.texto, leer: d.texto, esError: true, tipo: d.tipo };
    }
    return { palabra: p.texto, leer: p.texto, esError: false, tipo: null };
  });
}

// ─── Dictado mágico ─────────────────────────────────────────────────────────

export interface RondaDictado {
  palabra: string;
  /** Grafemas de la palabra en orden (dígrafos como una ficha: ch, qu, ll…). */
  grafemas: string[];
  /** Fichas trampa con su tipo de error. */
  trampas: Array<{ texto: string; tipo: TipoError }>;
}

const ESPEJO: Record<string, string> = { b: 'd', d: 'b', p: 'q', q: 'p' };
const SONORIDAD: Record<string, string> = { p: 'b', b: 'p', t: 'd', d: 't', c: 'g', g: 'c', f: 'v', v: 'f' };

/** Grafemas de una palabra para escribirla con fichas: plato → p·l·a·t·o; queso → qu·e·s·o. */
export function grafemasParaDictado(palabra: string): string[] {
  const grafemas: string[] = [];
  for (const t of tokenizar(palabra)) {
    if (t.tipo === 'C') grafemas.push(t.texto);
    else grafemas.push(...t.texto);
  }
  return grafemas;
}

export function generarDictado(
  palabras: readonly PalabraJuego[],
  mundo: number,
  rnd: Aleatorio,
  rondas = 5,
  maxGrafemas = 6,
  numTrampas = 3,
): RondaDictado[] {
  const letrasMundo = [...permitidosEnMundo(mundo).grafemas].filter((g) => g.length === 1 && !'aeiou'.includes(g));
  // Mejor palabras cortas y sin tilde para empezar a escribir.
  const sinTilde = palabras.filter((p) => !/[áéíóú]/.test(p.texto) && grafemasParaDictado(p.texto).length <= maxGrafemas);
  const base = sinTilde.length >= rondas ? sinTilde : palabras;

  return rnd
    .barajar(base)
    .slice(0, rondas)
    .map((p) => {
      const grafemas = grafemasParaDictado(p.texto);
      const trampas: Array<{ texto: string; tipo: TipoError }> = [];
      const anadir = (texto: string | undefined, tipo: TipoError) => {
        if (texto && !grafemas.includes(texto) && !trampas.some((t) => t.texto === texto)) trampas.push({ texto, tipo });
      };
      for (const g of rnd.barajar(grafemas)) {
        anadir(ESPEJO[g], 'espejo');
        anadir(SONORIDAD[g], 'sonoridad');
      }
      for (const l of rnd.barajar(letrasMundo)) anadir(l, 'sustitucion');
      return { palabra: p.texto, grafemas, trampas: trampas.slice(0, numTrampas) };
    });
}

// ─── Parejas por turnos ─────────────────────────────────────────────────────

export interface CartaPareja {
  id: string;
  palabra: string;
  img: number;
  /** "palabra" muestra el texto; "dibujo", el pictograma. */
  cara: 'palabra' | 'dibujo';
}

export function generarParejas(palabras: readonly PalabraJuego[], rnd: Aleatorio, parejas = 6): CartaPareja[] {
  const vistas = new Set<number>();
  const elegidas = rnd
    .barajar(palabras)
    .filter((p) => (vistas.has(p.img) ? false : (vistas.add(p.img), true)))
    .slice(0, parejas);
  return rnd.barajar(
    elegidas.flatMap((p) => [
      { id: `${p.texto}-p`, palabra: p.texto, img: p.img, cara: 'palabra' as const },
      { id: `${p.texto}-d`, palabra: p.texto, img: p.img, cara: 'dibujo' as const },
    ]),
  );
}
