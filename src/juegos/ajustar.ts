/**
 * Ajusta un nivel ya generado al ESCALÓN DE RETO de la niña en ese juego
 * (1 = más amable, 5 = más reto). Se hace en la tablet al empezar a jugar,
 * sin tocar el contenido guardado.
 */
import type { Contenido, DistractorDatos, ItemTren, Nivel, NivelBurbujas, NivelDetective, NivelIntrusa, NivelTren } from '../datos/esquemas.ts';
import { crearAleatorio, type Aleatorio } from '../lib/aleatorio.ts';
import { distractoresSilaba, type TipoError } from '../lib/distractores.ts';
import { generarIntrusas, type DificultadIntrusa } from '../lib/intrusas.ts';

const VISUALES: readonly string[] = ['espejo', 'sustitucion', 'comprension'];
const FONOLOGICOS: readonly string[] = ['sonoridad', 'inversion', 'omision'];

/** Semilla estable a partir de un texto (mismo nivel + escalón → mismas rondas). */
export function semillaDe(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const porEscalon = <T,>(e: number, valores: readonly [T, T, T, T, T]): T => valores[Math.min(5, Math.max(1, e)) - 1] as T;

// ─── Burbujas ───────────────────────────────────────────────────────────────

function ajustarBurbujas(n: NivelBurbujas, e: number): NivelBurbujas {
  const factor = porEscalon(e, [1.3, 1.12, 1, 0.85, 0.72]);
  const maxBase = n.maxBurbujas + (e - 3);
  // Escalones bajos: trampas que se VEN distintas; altos: trampas que SUENAN parecido.
  const preferidos = e <= 2 ? VISUALES : e >= 4 ? FONOLOGICOS : null;
  const filtrados = preferidos ? n.distractores.filter((d) => preferidos.includes(d.tipo)) : n.distractores;
  return {
    ...n,
    velocidad: Math.min(30, Math.max(3, Math.round(n.velocidad * factor * 10) / 10)),
    maxBurbujas: n.esFrase ? Math.min(4, Math.max(2, maxBase)) : Math.min(8, Math.max(3, maxBase)),
    proporcion: porEscalon(e, [0.5, 0.45, 0.4, 0.35, 0.3]),
    distractores: filtrados.length >= 2 ? filtrados : n.distractores,
  };
}

// ─── Letra intrusa ──────────────────────────────────────────────────────────

export const INTRUSA_POR_ESCALON: readonly (readonly DificultadIntrusa[])[] = [
  ['muy-distinta', 'normal'],
  ['normal', 'muy-distinta'],
  ['palabra-real', 'normal'],
  ['espejo', 'palabra-real', 'normal'],
  ['espejo', 'palabra-real', 'normal'],
];

function ajustarIntrusa(n: NivelIntrusa, e: number, diccionario: ReadonlySet<string>, rnd: Aleatorio): NivelIntrusa {
  const preferencias = INTRUSA_POR_ESCALON[Math.min(5, Math.max(1, e)) - 1] ?? [];
  const items = n.items.map((item) => {
    // Misma palabra y misma letra (la palabra secreta no cambia); otra posición/dificultad.
    const opciones = generarIntrusas(item.palabra, [item.letra], diccionario);
    for (const pref of preferencias) {
      const c = rnd.elegir(opciones.filter((o) => o.dificultad === pref));
      if (c) return { ...item, conIntrusa: c.texto, posicion: c.posicion, dificultad: c.dificultad };
    }
    return item;
  });
  // En el último escalón la palabra ya no suena sola.
  return { ...n, items, audioAuto: e < 5 };
}

// ─── Tren ───────────────────────────────────────────────────────────────────

function trampas(piezas: readonly string[], cuantas: number, e: number, rnd: Aleatorio): DistractorDatos[] {
  const orden: TipoError[] = e <= 2 ? ['espejo', 'sustitucion', 'inversion', 'sonoridad', 'omision'] : ['inversion', 'sonoridad', 'omision', 'espejo'];
  const resultado: DistractorDatos[] = [];
  for (const silaba of rnd.barajar(piezas)) {
    const opciones = distractoresSilaba(silaba).filter((d) => !piezas.includes(d.texto) && !d.texto.includes('q'));
    for (const tipo of orden) {
      const d = rnd.elegir(opciones.filter((o) => o.tipo === tipo && !resultado.some((r) => r.texto === o.texto)));
      if (d) {
        resultado.push(d);
        break;
      }
    }
    if (resultado.length >= cuantas) break;
  }
  return resultado;
}

function ajustarTren(n: NivelTren, e: number, contenido: Contenido, rnd: Aleatorio): NivelTren {
  const [min, max] = porEscalon<[number, number]>(e, [[2, 2], [2, 2], [2, 3], [3, 4], [3, 4]]);
  const cuantasTrampas = e >= 4 ? 2 : 1;
  // El tren de frases solo gana una trampa más.
  if (n.items.some((i) => i.unidad === 'palabra')) return n;

  const candidatas = Object.entries(contenido.palabras).filter(([, p]) => p.silabas.length >= min && p.silabas.length <= max);
  const elegidas = rnd.barajar(candidatas).slice(0, n.items.length);
  const items: ItemTren[] =
    elegidas.length >= Math.min(3, n.items.length)
      ? elegidas.map(([texto, p]) => ({
          piezas: p.silabas,
          huecos: p.silabas.map((_, i) => i),
          trampas: trampas(p.silabas, cuantasTrampas, e, rnd),
          escena: { elementos: [{ palabra: texto, escala: 1, copias: 1 }] },
          lectura: texto,
          unidad: 'silaba',
        }))
      : n.items.map((i) => ({ ...i, trampas: trampas(i.piezas, cuantasTrampas, e, rnd) }));
  return { ...n, items };
}

// ─── Detective ──────────────────────────────────────────────────────────────

function ajustarDetective(n: NivelDetective, e: number, contenido: Contenido, rnd: Aleatorio): NivelDetective {
  const opciones = e <= 2 ? 2 : 3;
  const palabras = Object.keys(contenido.palabras);
  const items = n.items.map((item) => {
    const correcta = item.escenas[item.correcta];
    if (!correcta) return item;
    const malas = item.escenas.filter((_, i) => i !== item.correcta);
    while (malas.length < opciones - 1) {
      const usada = new Set([...malas, correcta].flatMap((s) => s.elementos.map((x) => x.palabra)));
      const otra = rnd.elegir(palabras.filter((p) => !usada.has(p)));
      if (!otra) break;
      malas.push({ elementos: [{ palabra: otra, escala: 1, copias: 1 }] });
    }
    const escenas = rnd.barajar([correcta, ...malas.slice(0, opciones - 1)]);
    return { ...item, escenas, correcta: escenas.indexOf(correcta) };
  });
  return { ...n, items };
}

// ─── Entrada ────────────────────────────────────────────────────────────────

export function ajustarNivel(nivel: Nivel, escalon: number, contenido: Contenido): Nivel {
  const rnd = crearAleatorio(semillaDe(`${nivel.id}:${escalon}`));
  switch (nivel.mecanica) {
    case 'burbujas':
      return ajustarBurbujas(nivel, escalon);
    case 'intrusa':
      return ajustarIntrusa(nivel, escalon, new Set(Object.keys(contenido.palabras)), rnd);
    case 'tren':
      return ajustarTren(nivel, escalon, contenido, rnd);
    case 'detective':
      return ajustarDetective(nivel, escalon, contenido, rnd);
    case 'carrera':
      return nivel; // la carrera no se adapta: es la regla de medir
  }
}

// ─── Parámetros de los juegos con el profe ──────────────────────────────────

export function parametrosProfe(e: number) {
  return {
    /** ¡Pillado!: errores más fáciles de oír abajo, más sutiles arriba. */
    erroresPillado: porEscalon<TipoError[]>(e, [
      ['omision', 'inversion'],
      ['omision', 'inversion', 'sonoridad'],
      ['inversion', 'omision', 'sonoridad', 'espejo'],
      ['sonoridad', 'espejo', 'inversion'],
      ['espejo', 'sonoridad', 'inversion'],
    ]),
    /** Dictado: largo máximo de la palabra (en fichas) y número de fichas trampa. */
    maxGrafemas: porEscalon(e, [4, 5, 5, 6, 7]),
    trampasDictado: porEscalon(e, [2, 2, 3, 3, 4]),
    /** Parejas: cuántas parejas hay en la mesa. */
    parejas: porEscalon(e, [4, 5, 6, 7, 8]),
  };
}
