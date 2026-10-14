/**
 * TRAZA LA LETRA: modelos de trazo y comprobación (sin IA, solo geometría).
 *
 * Cada letra es una lista de TRAZOS en orden; cada trazo, una lista de puntos
 * en la dirección en que se escribe (como se enseña en el cole: los redondos
 * empiezan arriba a la derecha y giran hacia la izquierda).
 *
 * Coordenadas de la pauta (y hacia abajo):
 *   y = 0   línea de ascendentes (l, b, d, t…)
 *   y = 40  línea de las minúsculas
 *   y = 80  línea base
 *   y = 120 línea de descendentes (p, q, g, j, y)
 */
export interface Punto {
  x: number;
  y: number;
}
export type Trazo = Punto[];

export const PAUTA = { ascendente: 0, media: 40, base: 80, descendente: 120 } as const;

// ─── Constructores de formas ────────────────────────────────────────────────

/** Segmento recto con puntos cada ~2 unidades. */
function L(x1: number, y1: number, x2: number, y2: number): Punto[] {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n }));
}

/**
 * Arco de circunferencia. Ángulos en grados con y hacia abajo:
 * 0 = derecha, 90 = abajo, 180 = izquierda, 270 = arriba.
 * Ángulo DEcreciente = giro antihorario en pantalla (como la "c").
 */
function A(cx: number, cy: number, r: number, desde: number, hasta: number): Punto[] {
  const n = Math.max(4, Math.ceil((Math.abs(hasta - desde) / 360) * 2 * Math.PI * r / 2));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((desde + ((hasta - desde) * i) / n) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

/** Une varias partes en un solo trazo (sin repetir el punto de unión). */
function T(...partes: Punto[][]): Punto[] {
  return partes.flatMap((p, i) => (i === 0 ? p : p.slice(1)));
}

/** Punto (el de la i y la j). */
const P = (x: number, y: number): Punto[] => [{ x, y }];

// Redondo de la "a", "d", "g", "q": empieza arriba a la derecha y gira a la izquierda.
const redondo = (cx = 30) => A(cx, 60, 20, 330, -30);
// Redondo de la "b" y la "p": sale del palo y gira a la derecha.
const redondoDerecha = (cx = 32) => A(cx, 60, 20, 180, 540);

export const LETRAS: Readonly<Record<string, readonly Trazo[]>> = {
  a: [redondo(), L(50, 40, 50, 80)],
  b: [L(12, 0, 12, 80), redondoDerecha()],
  c: [A(30, 60, 20, 320, 40)],
  d: [redondo(), L(50, 0, 50, 80)],
  e: [T(L(10, 60, 50, 60), A(30, 60, 20, 360, 40))],
  f: [T(A(32, 16, 12, 330, 180), L(20, 16, 20, 80)), L(8, 40, 36, 40)],
  g: [redondo(), T(L(50, 40, 50, 105), A(35, 105, 15, 0, 150))],
  h: [L(12, 0, 12, 80), T(A(30, 60, 18, 180, 360), L(48, 60, 48, 80))],
  i: [L(20, 40, 20, 80), P(20, 24)],
  j: [T(L(32, 40, 32, 105), A(20, 105, 12, 0, 160)), P(32, 24)],
  k: [L(12, 0, 12, 80), T(L(42, 40, 14, 62), L(14, 62, 44, 80))],
  l: [L(20, 0, 20, 80)],
  m: [L(8, 40, 8, 80), T(A(21, 58, 13, 180, 360), L(34, 58, 34, 80)), T(A(47, 58, 13, 180, 360), L(60, 58, 60, 80))],
  n: [L(12, 40, 12, 80), T(A(30, 60, 18, 180, 360), L(48, 60, 48, 80))],
  ñ: [L(12, 40, 12, 80), T(A(30, 60, 18, 180, 360), L(48, 60, 48, 80)), T(L(14, 28, 22, 22), L(22, 22, 32, 30), L(32, 30, 42, 24))],
  o: [A(30, 60, 20, 300, -60)],
  p: [L(12, 40, 12, 120), redondoDerecha()],
  q: [redondo(), L(50, 40, 50, 120)],
  r: [L(12, 40, 12, 80), A(30, 60, 18, 180, 300)],
  s: [T(A(30, 50, 10, 330, 90), A(30, 70, 10, 270, 510))],
  t: [L(22, 8, 22, 80), L(8, 40, 38, 40)],
  u: [T(L(10, 40, 10, 62), A(28, 62, 18, 180, 0)), L(46, 40, 46, 80)],
  v: [T(L(6, 40, 26, 80), L(26, 80, 46, 40))],
  x: [L(8, 40, 44, 80), L(44, 40, 8, 80)],
  y: [L(6, 40, 26, 80), L(46, 40, 16, 120)],
  z: [T(L(8, 40, 44, 40), L(44, 40, 8, 80), L(8, 80, 44, 80))],
};

/** Ancho de la caja de una letra (para centrarla). */
export function anchoLetra(letra: string): number {
  const xs = (LETRAS[letra] ?? []).flat().map((p) => p.x);
  return xs.length ? Math.max(...xs) + 8 : 60;
}

// ─── Comprobación ───────────────────────────────────────────────────────────

export function longitud(trazo: readonly Punto[]): number {
  let total = 0;
  for (let i = 1; i < trazo.length; i++) {
    const a = trazo[i - 1]!;
    const b = trazo[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/** Remuestrea un trazo a `n` puntos repartidos por igual a lo largo del recorrido. */
export function remuestrear(trazo: readonly Punto[], n = 32): Punto[] {
  if (trazo.length === 0) return [];
  if (trazo.length === 1) return Array.from({ length: n }, () => ({ ...trazo[0]! }));
  const total = longitud(trazo);
  if (total === 0) return Array.from({ length: n }, () => ({ ...trazo[0]! }));

  const paso = total / (n - 1);
  const resultado: Punto[] = [{ ...trazo[0]! }];
  let acumulado = 0;
  let i = 1;
  let previo = trazo[0]!;
  while (resultado.length < n - 1 && i < trazo.length) {
    const actual = trazo[i]!;
    const tramo = Math.hypot(actual.x - previo.x, actual.y - previo.y);
    if (acumulado + tramo >= paso && tramo > 0) {
      const t = (paso - acumulado) / tramo;
      const nuevo = { x: previo.x + t * (actual.x - previo.x), y: previo.y + t * (actual.y - previo.y) };
      resultado.push(nuevo);
      previo = nuevo;
      acumulado = 0;
    } else {
      acumulado += tramo;
      previo = actual;
      i++;
    }
  }
  while (resultado.length < n) resultado.push({ ...trazo[trazo.length - 1]! });
  return resultado;
}

function distanciaMedia(a: readonly Punto[], b: readonly Punto[]): number {
  let suma = 0;
  for (let i = 0; i < a.length; i++) suma += Math.hypot(a[i]!.x - b[i]!.x, a[i]!.y - b[i]!.y);
  return suma / a.length;
}

export type ResultadoTrazo = 'bien' | 'al-reves' | 'forma' | 'corto';

/**
 * Compara lo que ha dibujado con el trazo modelo.
 *  - bien: sigue el camino, en la dirección correcta;
 *  - al-reves: sigue el camino pero empezando por el final (dirección invertida);
 *  - corto: se queda a medias;
 *  - forma: no sigue el camino.
 * `tolerancia` en unidades de pauta (40 = altura de una minúscula).
 */
export function evaluarTrazo(modelo: readonly Punto[], dibujo: readonly Punto[], tolerancia: number): ResultadoTrazo {
  // El punto de la i y la j: basta con tocar cerca.
  if (modelo.length === 1) {
    const d = dibujo[0];
    const m = modelo[0]!;
    return d && Math.hypot(d.x - m.x, d.y - m.y) <= tolerancia * 1.3 ? 'bien' : 'forma';
  }
  if (dibujo.length < 2 || longitud(dibujo) < 0.5 * longitud(modelo)) return 'corto';

  const m = remuestrear(modelo);
  const d = remuestrear(dibujo);
  if (distanciaMedia(m, d) <= tolerancia) return 'bien';
  if (distanciaMedia(m, [...d].reverse()) <= tolerancia) return 'al-reves';
  return 'forma';
}

/** Tolerancia según el escalón de reto: más amable abajo, más exigente arriba. */
export function toleranciaDe(escalon: number): number {
  return [18, 15, 13, 12, 11][Math.min(5, Math.max(1, escalon)) - 1] ?? 13;
}
