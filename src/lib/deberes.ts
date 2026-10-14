/**
 * LA MOCHILA (deberes para casa).
 * El tutor elige un mundo, unas actividades y cuántos días por semana.
 * Un día cuenta como "hecho" si ese día, en la tablet de CASA, ha completado
 * todas las actividades (cualquier nivel de esa actividad en ese mundo).
 */
import type { Actividad, Contenido, Deberes, Nivel } from '../datos/esquemas.ts';
import { claveDia, claveSemana } from './metricas.ts';
import type { MejorNivel, PartidaRegistrada } from './progreso.ts';

export const NOMBRE_ACTIVIDAD: Record<Actividad, string> = {
  intrusa: 'Letra intrusa',
  burbujas: 'Pesca de burbujas',
  tren: 'Tren de sílabas',
  detective: 'Detective de dibujos',
  carrera: 'Carrera del cohete',
  trazo: 'Traza la letra',
  cuaderno: 'Dictado al cuaderno',
};

export const ACTIVIDADES_ESCRITURA: readonly Actividad[] = ['trazo', 'cuaderno'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type PartidaDia = Pick<PartidaRegistrada, 'mecanica' | 'mundo' | 'contexto' | 'fecha'>;

/** Actividades de los deberes ya hechas un día concreto (en casa). */
export function hechasElDia(deberes: Deberes, partidas: readonly PartidaDia[], dia: Date): Set<Actividad> {
  const clave = claveDia(dia);
  const hechas = new Set<Actividad>();
  for (const p of partidas) {
    if (p.contexto !== 'casa' || p.mundo !== deberes.mundo || claveDia(p.fecha) !== clave) continue;
    const a = deberes.actividades.find((x) => x === p.mecanica);
    if (a) hechas.add(a);
  }
  return hechas;
}

export interface DiaDeberes {
  clave: string;
  letra: string;
  /** Todas las actividades hechas ese día. */
  completo: boolean;
  /** Alguna, pero no todas. */
  parcial: boolean;
  esHoy: boolean;
  futuro: boolean;
}

export interface SemanaDeberes {
  /** Lunes de la semana (AAAA-MM-DD). */
  semana: string;
  dias: DiaDeberes[];
  completos: number;
  objetivo: number;
  cumplida: boolean;
}

/** Estado de una semana de deberes (de lunes a domingo) que contiene `referencia`. */
export function semanaDeDeberes(
  deberes: Deberes,
  partidas: readonly PartidaDia[],
  referencia: Date,
  hoy: Date = referencia,
): SemanaDeberes {
  const lunes = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const claveHoy = claveDia(hoy);

  const dias: DiaDeberes[] = DIAS.map((letra, i) => {
    const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
    const hechas = hechasElDia(deberes, partidas, d);
    const clave = claveDia(d);
    return {
      clave,
      letra,
      completo: hechas.size === deberes.actividades.length,
      parcial: hechas.size > 0 && hechas.size < deberes.actividades.length,
      esHoy: clave === claveHoy,
      futuro: clave > claveHoy,
    };
  });
  const completos = dias.filter((d) => d.completo).length;
  return { semana: claveSemana(lunes), dias, completos, objetivo: deberes.diasPorSemana, cumplida: completos >= deberes.diasPorSemana };
}

/** Las últimas `n` semanas (la actual primero), para el panel. */
export function historialDeberes(deberes: Deberes, partidas: readonly PartidaDia[], hoy: Date, n = 4): SemanaDeberes[] {
  return Array.from({ length: n }, (_, k) => {
    const ref = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7 * k);
    return semanaDeDeberes(deberes, partidas, ref, hoy);
  });
}

/**
 * Nivel del camino al que lleva una actividad: de esa mecánica en ese mundo,
 * el que tenga MENOS estrellas (a igualdad, el primero). Los deberes abren
 * el nivel aunque en el camino aún esté cerrado.
 */
export function nivelParaActividad(
  contenido: Contenido,
  actividad: Actividad,
  mejores: ReadonlyMap<string, MejorNivel>,
): Nivel | null {
  const candidatos = contenido.niveles.filter((n) => n.mecanica === actividad);
  let elegido: Nivel | null = null;
  let menos = Infinity;
  for (const n of candidatos) {
    const e = mejores.get(n.id)?.estrellas ?? 0;
    if (e < menos) {
      menos = e;
      elegido = n;
    }
  }
  return elegido;
}
