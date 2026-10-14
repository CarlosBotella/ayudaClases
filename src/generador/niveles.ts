/**
 * Generación de frases y niveles de un mundo, sin IA: solo reglas.
 *
 * Secuencia de 8 niveles (de menos a más difícil), alternando mecánicas:
 *   1 intrusa (muy distinta)        5 intrusa (real / espejo / sin audio, según mundo)
 *   2 burbujas (distractores visuales) 6 burbujas (fonológicos, o frases)
 *   3 tren (2 sílabas)              7 tren (3 sílabas, o frase con hueco)
 *   4 detective (2 dibujos)         8 carrera contra el fantasma
 * Si un nivel no se puede construir con las palabras disponibles, se omite y
 * se añade un aviso.
 */
import { permitidosEnMundo } from '../lib/clasificador.ts';
import { distractoresPalabra, distractoresSilaba, type Distractor, type TipoError } from '../lib/distractores.ts';
import { frasePareja, frasesCantidad, frasesNombre, frasesTamano, generoYArticulo, type Frase } from '../lib/frases.ts';
import { generarIntrusas, type DificultadIntrusa } from '../lib/intrusas.ts';
import { crearAleatorio, type Aleatorio } from '../lib/aleatorio.ts';
import { analizarSilabas, tokenizar } from '../lib/silabas.ts';
import type {
  EscenaDatos,
  FraseGuardada,
  ItemDetective,
  ItemIntrusa,
  ItemTren,
  Nivel,
  NivelBurbujas,
  NivelCarrera,
  NivelDetective,
  NivelIntrusa,
  NivelTren,
} from '../datos/esquemas.ts';

export interface PalabraMundo {
  texto: string;
  silabas: string[];
  img: number;
}

export interface ResultadoMundo {
  niveles: Nivel[];
  frases: FraseGuardada[];
  avisos: string[];
}

export const TITULOS = {
  intrusa: 'Letra intrusa',
  burbujas: 'Pesca de burbujas',
  tren: 'Tren de sílabas',
  detective: 'Detective de dibujos',
  carrera: 'Carrera contra tu fantasma',
} as const;

const escenaDe = (palabra: string): EscenaDatos => ({ elementos: [{ palabra, escala: 1, copias: 1 }] });

/** ¿Todas las consonantes de un texto (aunque sea inventado) son de este mundo o anteriores? */
function letrasConocidas(texto: string, grafemas: ReadonlySet<string>): boolean {
  return tokenizar(texto).every((t) => t.tipo === 'V' || grafemas.has(t.texto));
}

// ─── Frases ──────────────────────────────────────────────────────────────────

/** Otra palabra para el dibujo distractor: si puede, una que empiece igual (más difícil). */
function elegirCambio(palabra: string, lista: readonly PalabraMundo[], rnd: Aleatorio): string | undefined {
  const otras = lista.filter((p) => p.texto !== palabra);
  const inicial = palabra.charAt(0);
  const parecidas = otras.filter((p) => p.texto.charAt(0) === inicial);
  return (rnd.elegir(parecidas) ?? rnd.elegir(otras))?.texto;
}

export function generarFrases(mundo: number, palabras: readonly PalabraMundo[], rnd: Aleatorio): Frase[] {
  const conArticulo = palabras.filter((p) => generoYArticulo(p.texto));
  const candidatas: Frase[] = [];

  // "la mesa" / "mi oso": una por palabra, la primera que encaje.
  for (const p of palabras.slice(0, 12)) {
    const cambio = elegirCambio(p.texto, palabras, rnd);
    if (!cambio) continue;
    const frase = frasesNombre(p.texto, cambio).find((f) => f.mundo === mundo);
    if (frase) candidatas.push(frase);
  }

  // "pato y mesa" (la "y" es del Mundo 3).
  if (mundo >= 3) {
    for (let i = 0; i + 1 < Math.min(conArticulo.length, 10); i += 2) {
      const a = conArticulo[i]!.texto;
      const b = conArticulo[i + 1]!.texto;
      const cambio = elegirCambio(a, palabras.filter((p) => p.texto !== b), rnd);
      const frase = cambio ? frasePareja(a, b, cambio) : null;
      if (frase && frase.mundo === mundo) candidatas.push(frase);
    }
  }

  // "el pato es pequeño", "dos patos" ("el", "es", "dos" son del Mundo 4).
  if (mundo >= 4) {
    for (const p of conArticulo.slice(0, 8)) {
      const otro = elegirCambio(p.texto, conArticulo, rnd);
      candidatas.push(...frasesTamano(p.texto, otro).filter((f) => f.mundo === mundo));
      candidatas.push(...frasesCantidad(p.texto).filter((f) => f.mundo === mundo));
    }
  }

  const vistas = new Set<string>();
  return candidatas.filter((f) => !vistas.has(f.texto) && vistas.add(f.texto)).slice(0, 30);
}

const aGuardada = (f: Frase): FraseGuardada => ({
  texto: f.texto,
  plantilla: f.plantilla,
  mundo: f.mundo ?? 1,
  escena: f.escena,
  distractoras: f.distractoras,
});

// ─── Contexto compartido por los constructores de niveles ───────────────────

interface Ctx {
  mundo: number;
  palabras: readonly PalabraMundo[];
  diccionario: ReadonlySet<string>;
  rnd: Aleatorio;
  grafemas: ReadonlySet<string>;
  /** Sílaba → una palabra del mundo que la contiene (para el dibujo de apoyo). */
  silabas: Map<string, { palabra: string; patron: string }>;
  frases: Frase[];
}

type Modo = 'visual' | 'fonologico';

const ORDEN_TIPOS: Record<Modo, TipoError[]> = {
  visual: ['espejo', 'sustitucion', 'inversion', 'sonoridad', 'omision'],
  fonologico: ['sonoridad', 'inversion', 'omision', 'espejo', 'sustitucion'],
};

/** Distractores de una sílaba con letras que la niña conoce, ordenados según el modo. */
function distractoresParaSilaba(ctx: Ctx, silaba: string, modo: Modo, maximo: number): Distractor[] {
  const patron = analizarSilabas(silaba)[0]?.patron ?? '';
  const reglas = distractoresSilaba(silaba).filter(
    (d) => d.tipo === 'inversion' || letrasConocidas(d.texto, ctx.grafemas),
  );
  // Sustituciones: otras sílabas reales del mundo con el mismo patrón.
  const sustituciones: Distractor[] = ctx.rnd
    .barajar([...ctx.silabas].filter(([s, info]) => s !== silaba && info.patron === patron))
    .slice(0, 3)
    .map(([s]) => ({ texto: s, tipo: 'sustitucion' }));

  const todos = [...reglas, ...sustituciones];
  const resultado: Distractor[] = [];
  for (const tipo of ORDEN_TIPOS[modo]) {
    for (const d of ctx.rnd.barajar(todos.filter((x) => x.tipo === tipo))) {
      if (resultado.length >= maximo) break;
      if (!resultado.some((r) => r.texto === d.texto)) resultado.push(d);
    }
  }
  return resultado;
}

/** Sílabas "protagonistas" de un mundo: las que estrenan patrón o letras. */
function silabasObjetivo(ctx: Ctx): string[] {
  const nuevosPatrones = new Set(ctx.mundo >= 5 ? ['CCV', 'CCVC'] : ctx.mundo === 4 ? ['VC', 'CVC'] : ['CV']);
  const anteriores = ctx.mundo > 1 ? permitidosEnMundo(ctx.mundo - 1).grafemas : new Set<string>();
  const todas = [...ctx.silabas].filter(([, info]) => nuevosPatrones.has(info.patron)).map(([s]) => s);
  // En los mundos 2 y 3, mejor las que llevan alguna letra nueva.
  const conLetraNueva = todas.filter((s) =>
    tokenizar(s).some((t) => t.tipo === 'C' && !anteriores.has(t.texto)),
  );
  return conLetraNueva.length > 0 ? conLetraNueva : todas;
}

// ─── Constructores de niveles ───────────────────────────────────────────────

function nivelIntrusa(
  ctx: Ctx,
  id: string,
  dificultad: number,
  preferencias: readonly DificultadIntrusa[],
  audioAuto: boolean,
): NivelIntrusa | null {
  const sencilla = (t: string) =>
    /^[a-zñ]{3,5}$/.test(t) &&
    tokenizar(t).every((tok) => tok.texto.length === 1) &&
    letrasConocidas(t, ctx.grafemas);
  const secretas = ctx.rnd.barajar(ctx.palabras.filter((p) => sencilla(p.texto))).slice(0, 20);

  for (const secreta of secretas) {
    const usadas = new Set([secreta.texto]);
    const items: ItemIntrusa[] = [];

    for (const letra of secreta.texto) {
      let elegido: ItemIntrusa | null = null;
      for (const pref of preferencias) {
        for (const p of ctx.rnd.barajar(ctx.palabras)) {
          if (usadas.has(p.texto) || [...p.texto].length > 6) continue;
          const opciones = generarIntrusas(p.texto, [letra], ctx.diccionario).filter((c) => c.dificultad === pref);
          const c = ctx.rnd.elegir(opciones);
          if (c) {
            elegido = { palabra: p.texto, conIntrusa: c.texto, posicion: c.posicion, letra: c.letra, dificultad: c.dificultad };
            break;
          }
        }
        if (elegido) break;
      }
      if (!elegido) break;
      items.push(elegido);
      usadas.add(elegido.palabra);
    }

    if (items.length === secreta.texto.length) {
      return { id, titulo: TITULOS.intrusa, dificultad, mecanica: 'intrusa', items, secreta: secreta.texto, audioAuto };
    }
  }
  return null;
}

function nivelBurbujasSilaba(ctx: Ctx, id: string, dificultad: number, modo: Modo, evitar: Set<string>): NivelBurbujas | null {
  const objetivos = ctx.rnd.barajar(silabasObjetivo(ctx).filter((s) => !evitar.has(s)));
  for (const objetivo of objetivos) {
    const distractores = distractoresParaSilaba(ctx, objetivo, modo, 4);
    const info = ctx.silabas.get(objetivo);
    if (distractores.length < 2 || !info) continue;
    evitar.add(objetivo);
    return {
      id,
      titulo: TITULOS.burbujas,
      dificultad,
      mecanica: 'burbujas',
      objetivo,
      patron: info.patron,
      pista: escenaDe(info.palabra),
      distractores,
      meta: modo === 'visual' ? 6 : 8,
      velocidad: modo === 'visual' ? 11 : 8,
      maxBurbujas: modo === 'visual' ? 5 : 6,
      proporcion: 0.4,
      esFrase: false,
    };
  }
  return null;
}

function nivelBurbujasFrase(ctx: Ctx, id: string, dificultad: number): NivelBurbujas | null {
  const frases = ctx.rnd.barajar(ctx.frases);
  const objetivo = frases[0];
  if (!objetivo || frases.length < 4) return null;
  // Distractoras: otras frases, mejor de la misma plantilla (se parecen más).
  const mismas = frases.slice(1).filter((f) => f.plantilla === objetivo.plantilla);
  const otras = [...mismas, ...frases.slice(1).filter((f) => f.plantilla !== objetivo.plantilla)];
  return {
    id,
    titulo: TITULOS.burbujas,
    dificultad,
    mecanica: 'burbujas',
    objetivo: objetivo.texto,
    patron: 'frase',
    pista: objetivo.escena,
    distractores: otras.slice(0, 3).map((f) => ({ texto: f.texto, tipo: 'comprension' })),
    meta: 5,
    velocidad: 13,
    maxBurbujas: 4,
    proporcion: 0.4,
    esFrase: true,
  };
}

function trampaPara(ctx: Ctx, palabra: PalabraMundo, modo: Modo): Distractor | undefined {
  for (const silaba of ctx.rnd.barajar(palabra.silabas)) {
    const d = distractoresParaSilaba(ctx, silaba, modo, 1)[0];
    if (d && !palabra.silabas.includes(d.texto)) return d;
  }
  return undefined;
}

function nivelTrenPalabras(ctx: Ctx, id: string, dificultad: number, silabasMin: number, modo: Modo, usadas: Set<string>): NivelTren | null {
  const porTamano = (min: number) =>
    ctx.palabras.filter((p) => p.silabas.length >= min && p.silabas.length <= 4 && !usadas.has(p.texto));
  let lista = porTamano(silabasMin);
  if (lista.length < 3) lista = porTamano(2);
  if (lista.length < 3) lista = porTamano(1);

  const items: ItemTren[] = [];
  for (const p of ctx.rnd.barajar(lista)) {
    if (items.length >= 4) break;
    const trampa = trampaPara(ctx, p, modo);
    if (!trampa) continue;
    usadas.add(p.texto);
    items.push({
      piezas: p.silabas,
      huecos: p.silabas.map((_, i) => i),
      trampas: [trampa],
      escena: escenaDe(p.texto),
      lectura: p.texto,
      unidad: 'silaba',
    });
  }
  return items.length >= 2 ? { id, titulo: TITULOS.tren, dificultad, mecanica: 'tren', items } : null;
}

function nivelTrenFrases(ctx: Ctx, id: string, dificultad: number): NivelTren | null {
  const palabrasMundo = new Map(ctx.palabras.map((p) => [p.texto, p]));
  const items: ItemTren[] = [];

  for (const f of ctx.rnd.barajar(ctx.frases)) {
    if (items.length >= 4) break;
    const piezas = f.texto.split(' ');
    const hueco = piezas.findIndex((w) => palabrasMundo.has(w));
    const nombre = piezas[hueco];
    if (hueco < 0 || !nombre) continue;

    // Trampa: una palabra REAL que se confunde con la del hueco (plato/pato).
    const real = distractoresPalabra(nombre).find((d) => ctx.diccionario.has(d.texto));
    const otra = elegirCambio(nombre, ctx.palabras, ctx.rnd);
    const trampa: Distractor | undefined = real ?? (otra ? { texto: otra, tipo: 'comprension' } : undefined);
    if (!trampa) continue;

    items.push({ piezas, huecos: [hueco], trampas: [trampa], escena: f.escena, lectura: f.texto, unidad: 'palabra' });
  }
  return items.length >= 3 ? { id, titulo: 'Tren de frases', dificultad, mecanica: 'tren', items } : null;
}

function nivelDetective(ctx: Ctx, id: string, dificultad: number, opciones: 2 | 3): NivelDetective | null {
  const items: ItemDetective[] = [];
  for (const f of ctx.rnd.barajar(ctx.frases)) {
    if (items.length >= 5) break;
    const extras = ctx.palabras
      .filter((p) => !f.escena.elementos.some((e) => e.palabra === p.texto))
      .map((p) => escenaDe(p.texto));
    const malas = [...f.distractoras, ...ctx.rnd.barajar(extras)].slice(0, opciones - 1);
    if (malas.length < opciones - 1) continue;

    const escenas = ctx.rnd.barajar([f.escena, ...malas]);
    items.push({ frase: f.texto, escenas, correcta: escenas.indexOf(f.escena) });
  }
  return items.length >= 3 ? { id, titulo: TITULOS.detective, dificultad, mecanica: 'detective', items } : null;
}

function nivelCarrera(ctx: Ctx, id: string, dificultad: number): NivelCarrera | null {
  // Las 10 más frecuentes, en orden fijo: así el fantasma compite en igualdad.
  const palabras = ctx.palabras.slice(0, 10).map((p) => p.texto);
  return palabras.length >= 5
    ? { id, titulo: TITULOS.carrera, dificultad, mecanica: 'carrera', palabras }
    : null;
}

// ─── Mundo completo ─────────────────────────────────────────────────────────

/** Escalón de las intrusas del nivel 5 según el mundo (progresión de la ficha). */
function intrusaAvanzada(mundo: number): { prefs: DificultadIntrusa[]; audio: boolean } {
  if (mundo <= 1) return { prefs: ['normal', 'palabra-real', 'muy-distinta'], audio: true };
  if (mundo === 2) return { prefs: ['palabra-real', 'normal', 'muy-distinta'], audio: true };
  if (mundo === 3) return { prefs: ['espejo', 'palabra-real', 'normal'], audio: true };
  return { prefs: ['palabra-real', 'espejo', 'normal'], audio: false };
}

export function generarMundo(
  mundo: number,
  palabras: readonly PalabraMundo[],
  diccionario: ReadonlySet<string>,
  semilla = mundo * 7919,
): ResultadoMundo {
  const rnd = crearAleatorio(semilla);
  const avisos: string[] = [];
  if (palabras.length < 12) avisos.push(`Hay pocas palabras (${palabras.length}): algunos niveles pueden faltar.`);

  // Sílabas del mundo sin tilde (la tilde en una burbuja suelta despista).
  const silabas = new Map<string, { palabra: string; patron: string }>();
  for (const p of palabras) {
    for (const s of analizarSilabas(p.texto)) {
      if (/[áéíóú]/.test(s.texto)) continue;
      if (!silabas.has(s.texto)) silabas.set(s.texto, { palabra: p.texto, patron: s.patron });
    }
  }

  const frases = generarFrases(mundo, palabras, rnd);
  const ctx: Ctx = { mundo, palabras, diccionario, rnd, grafemas: permitidosEnMundo(mundo).grafemas, silabas, frases };

  const id = (n: number) => `m${mundo}-n${n}`;
  const avanzada = intrusaAvanzada(mundo);
  const silabasUsadas = new Set<string>();
  const palabrasTren = new Set<string>();

  const plan: Array<[string, () => Nivel | null]> = [
    ['1 · intrusa', () => nivelIntrusa(ctx, id(1), 1, ['muy-distinta', 'normal'], true)],
    ['2 · burbujas', () => nivelBurbujasSilaba(ctx, id(2), 1, 'visual', silabasUsadas)],
    ['3 · tren', () => nivelTrenPalabras(ctx, id(3), 2, 2, 'visual', palabrasTren)],
    ['4 · detective', () => nivelDetective(ctx, id(4), 2, 2) ?? nivelIntrusa(ctx, id(4), 2, ['normal'], true)],
    ['5 · intrusa', () => nivelIntrusa(ctx, id(5), 3, avanzada.prefs, avanzada.audio)],
    ['6 · burbujas', () =>
      (mundo >= 3 ? nivelBurbujasFrase(ctx, id(6), 4) : null) ??
      nivelBurbujasSilaba(ctx, id(6), 3, 'fonologico', silabasUsadas)],
    ['7 · tren', () =>
      (mundo >= 4 ? nivelTrenFrases(ctx, id(7), 4) : null) ??
      nivelTrenPalabras(ctx, id(7), 4, 3, 'fonologico', palabrasTren)],
    ['8 · carrera', () => nivelCarrera(ctx, id(8), 4)],
  ];

  const niveles: Nivel[] = [];
  for (const [nombre, construir] of plan) {
    const nivel = construir();
    if (nivel) niveles.push(nivel);
    else avisos.push(`No se pudo crear el nivel ${nombre} con estas palabras.`);
  }

  return { niveles, frases: frases.map(aGuardada), avisos };
}
