/**
 * DIFICULTAD ADAPTATIVA
 * Cada juego tiene su propio "escalón de reto" (1 a 5).
 *  - Sube un escalón si acierta a la primera ≥ 85 % en DOS partidas seguidas.
 *  - Baja un escalón si acierta < 60 % en DOS partidas seguidas (sin avisarle).
 *  - Entre medias se queda: es su zona de aprendizaje (~8 de cada 10).
 * El tutor puede fijar un escalón a mano desde el panel (planes/{sid}).
 * Se calcula en la tablet a partir de sus partidas: funciona sin conexión.
 */
import type { Mecanica } from '../datos/esquemas.ts';

export const UMBRAL_SUBIR = 0.85;
export const UMBRAL_BAJAR = 0.6;
export const PARTIDAS_SEGUIDAS = 2;
export const ESCALON_MIN = 1;
export const ESCALON_MAX = 5;
/** Escalón de partida de cada juego. */
export const ESCALON_INICIAL = 2;

/**
 * La carrera NO se adapta: es la "regla de medir" de las palabras correctas por
 * minuto. Si cambiaran sus palabras, la gráfica de evolución dejaría de ser comparable.
 */
export const JUEGOS_SIN_ADAPTAR: readonly Mecanica[] = ['carrera'];

export interface PartidaReto {
  mecanica: Mecanica;
  /** 0–1: proporción de ítems acertados a la primera. */
  puntuacion: number;
  fecha: Date;
}

export interface CambioReto {
  fecha: Date;
  de: number;
  a: number;
}

export interface EstadoReto {
  escalon: number;
  /** true si lo ha fijado el tutor (no se mueve solo). */
  fijo: boolean;
  /** Escalón que tendría en automático. */
  automatico: number;
  cambios: CambioReto[];
}

/** Recorre las partidas de UN juego (de la más antigua a la más reciente). */
export function escalonAutomatico(partidas: readonly PartidaReto[], inicial = ESCALON_INICIAL): { escalon: number; cambios: CambioReto[] } {
  let escalon = inicial;
  let altas = 0;
  let bajas = 0;
  const cambios: CambioReto[] = [];

  for (const p of [...partidas].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())) {
    if (p.puntuacion >= UMBRAL_SUBIR) {
      altas++;
      bajas = 0;
    } else if (p.puntuacion < UMBRAL_BAJAR) {
      bajas++;
      altas = 0;
    } else {
      altas = 0;
      bajas = 0;
    }

    if (altas >= PARTIDAS_SEGUIDAS && escalon < ESCALON_MAX) {
      cambios.push({ fecha: p.fecha, de: escalon, a: escalon + 1 });
      escalon++;
      altas = 0;
    } else if (bajas >= PARTIDAS_SEGUIDAS && escalon > ESCALON_MIN) {
      cambios.push({ fecha: p.fecha, de: escalon, a: escalon - 1 });
      escalon--;
      bajas = 0;
    }
  }
  return { escalon, cambios };
}

/** Estado del reto de cada juego, teniendo en cuenta lo que haya fijado el tutor. */
export function calcularRetos(
  partidas: readonly PartidaReto[],
  retoFijo: Readonly<Record<string, number>> = {},
): Partial<Record<Mecanica, EstadoReto>> {
  const porJuego = new Map<Mecanica, PartidaReto[]>();
  for (const p of partidas) porJuego.set(p.mecanica, [...(porJuego.get(p.mecanica) ?? []), p]);

  const juegos = new Set<Mecanica>([...porJuego.keys(), ...(Object.keys(retoFijo) as Mecanica[])]);
  const resultado: Partial<Record<Mecanica, EstadoReto>> = {};
  for (const juego of juegos) {
    const { escalon, cambios } = escalonAutomatico(porJuego.get(juego) ?? []);
    const fijado = retoFijo[juego];
    resultado[juego] = fijado
      ? { escalon: fijado, fijo: true, automatico: escalon, cambios }
      : { escalon, fijo: false, automatico: escalon, cambios };
  }
  return resultado;
}

/** Escalón con el que se juega ahora a un juego. */
export function escalonDe(retos: Partial<Record<Mecanica, EstadoReto>>, juego: Mecanica): number {
  if (JUEGOS_SIN_ADAPTAR.includes(juego)) return 3;
  return retos[juego]?.escalon ?? ESCALON_INICIAL;
}
