/**
 * Estrellas de un nivel (1 a 3), por acierto + tiempo.
 *  ★     completar el nivel (siempre: nunca hay "game over")
 *  ★★    acertar a la primera al menos el 60 % de los ítems
 *  ★★★   acertar a la primera el 85 % y dentro del tiempo objetivo
 *        (en la carrera: el 80 % de palabras bien y ganar al fantasma)
 */
import type { Mecanica } from '../datos/esquemas.ts';

/** Segundos "cómodos" por ítem para la tercera estrella. Generosos: lectora lenta. */
export const SEGUNDOS_POR_ITEM: Readonly<Record<Mecanica, number>> = {
  intrusa: 15,
  burbujas: 7,
  tren: 20,
  detective: 15,
  carrera: 5,
  pillado: 12,
  dictado: 30,
  parejas: 25,
};

export interface DatosEstrellas {
  mecanica: Mecanica;
  items: number;
  aciertosPrimera: number;
  duracionMs: number;
  /** Solo carrera: ¿ha superado su mejor marca (o es la primera vez)? */
  ganaAlFantasma?: boolean;
}

export function calcularEstrellas(d: DatosEstrellas): { estrellas: number; puntuacion: number } {
  const puntuacion = d.items > 0 ? Math.min(1, Math.max(0, d.aciertosPrimera / d.items)) : 0;
  let estrellas = 1;
  if (puntuacion >= 0.6) estrellas++;

  if (d.mecanica === 'carrera') {
    if (puntuacion >= 0.8 && d.ganaAlFantasma) estrellas++;
  } else {
    const objetivoMs = d.items * SEGUNDOS_POR_ITEM[d.mecanica] * 1000;
    if (puntuacion >= 0.85 && d.duracionMs <= objetivoMs) estrellas++;
  }
  return { estrellas: Math.min(3, estrellas), puntuacion: Math.round(puntuacion * 1000) / 1000 };
}

/** Palabras correctas por minuto. */
export function calcularPcpm(correctas: number, duracionMs: number): number {
  if (duracionMs <= 0) return 0;
  return Math.round((correctas / (duracionMs / 60000)) * 10) / 10;
}
