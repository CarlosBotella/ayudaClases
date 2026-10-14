/**
 * Métricas del panel del tutor. Se calculan en el navegador (es una sola
 * alumna) a partir de sus respuestas (attempts) y resultados de nivel.
 */
import type { Contexto, Mecanica, TipoErrorDatos } from '../datos/esquemas.ts';
import { grafemasDe } from './clasificador.ts';
import { silabear } from './silabas.ts';

export interface Respuesta {
  mecanica: Mecanica;
  item: string;
  unidadObjetivo: string;
  patron: string;
  correcto: boolean;
  errorTipo: TipoErrorDatos | null;
  latenciaMs: number;
  contexto: Contexto;
  fecha: Date;
}

export interface ResultadoNivel {
  nivelId: string;
  mecanica: Mecanica;
  estrellas: number;
  duracionMs: number;
  pcpm?: number;
  contexto: Contexto;
  fecha: Date;
}

export type TipoUnidad = 'silaba' | 'grafema';

// ─── Utilidades de fechas ───────────────────────────────────────────────────

/** Día local "AAAA-MM-DD". */
export function claveDia(f: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
}

/** Lunes de la semana de una fecha, como "AAAA-MM-DD" (semanas de lunes a domingo). */
export function claveSemana(f: Date): string {
  const d = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  const desdeLunes = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - desdeLunes);
  return claveDia(d);
}

export function mediana(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  const o = [...valores].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? (o[m] as number) : ((o[m - 1] as number) + (o[m] as number)) / 2;
}

const redondear = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// ─── Unidades que evalúa cada respuesta ─────────────────────────────────────

/**
 * Qué sílabas y grafemas evalúa una respuesta:
 *  - burbujas y tren: la sílaba objetivo (en frases, cada palabra);
 *  - dictado: el grafema que tocaba escribir;
 *  - carrera, ¡pillado! y parejas: todas las sílabas y grafemas de la palabra;
 *  - intrusa y detective no cuentan (son tareas visuales / de comprensión).
 */
export function unidadesDe(r: Respuesta): { silabas: string[]; grafemas: string[] } {
  const deTexto = (t: string) => ({ silabas: t.split(' ').flatMap(silabear), grafemas: grafemasDe(t.replaceAll(' ', '')) });
  switch (r.mecanica) {
    case 'burbujas':
    case 'tren':
      if (!r.unidadObjetivo) return { silabas: [], grafemas: [] };
      if (r.patron === 'frase' || r.patron === 'palabra') return deTexto(r.unidadObjetivo);
      return { silabas: [r.unidadObjetivo], grafemas: grafemasDe(r.unidadObjetivo) };
    case 'dictado':
      return { silabas: [], grafemas: r.unidadObjetivo ? [r.unidadObjetivo] : [] };
    case 'carrera':
    case 'pillado':
    case 'parejas':
      return deTexto(r.unidadObjetivo || r.item);
    default:
      return { silabas: [], grafemas: [] };
  }
}

// ─── Mapa de calor ──────────────────────────────────────────────────────────

export interface CeldaCalor {
  unidad: string;
  intentos: number;
  aciertos: number;
  /** 0–100 */
  porcentaje: number;
  latenciaMedianaMs: number;
}

export function mapaDeCalor(respuestas: readonly Respuesta[], tipo: TipoUnidad): CeldaCalor[] {
  const acumulado = new Map<string, { intentos: number; aciertos: number; latencias: number[] }>();
  for (const r of respuestas) {
    const unidades = tipo === 'silaba' ? unidadesDe(r).silabas : unidadesDe(r).grafemas;
    for (const u of new Set(unidades)) {
      const a = acumulado.get(u) ?? { intentos: 0, aciertos: 0, latencias: [] };
      a.intentos++;
      if (r.correcto) a.aciertos++;
      a.latencias.push(r.latenciaMs);
      acumulado.set(u, a);
    }
  }
  return [...acumulado]
    .map(([unidad, a]) => ({
      unidad,
      intentos: a.intentos,
      aciertos: a.aciertos,
      porcentaje: Math.round((a.aciertos / a.intentos) * 100),
      latenciaMedianaMs: Math.round(mediana(a.latencias)),
    }))
    .sort((x, y) => x.unidad.localeCompare(y.unidad, 'es'));
}

// ─── Dominio y lista de "a reforzar" ───────────────────────────────────────

export const INTENTOS_DOMINIO = 10;
export const PORCENTAJE_DOMINIO = 90;
export const DIAS_DOMINIO = 2;
/** A partir de cuántos intentos una unidad no dominada entra en "a reforzar". */
export const INTENTOS_MINIMOS_REFUERZO = 5;

export interface EstadoUnidad {
  unidad: string;
  /** % de acierto en los últimos 10 intentos (o en los que haya). */
  porcentajeReciente: number;
  intentos: number;
  dias: number;
  dominada: boolean;
}

/**
 * Unidad DOMINADA: ≥ 90 % de acierto en sus últimos 10 intentos, y esos
 * intentos repartidos en al menos 2 días distintos.
 */
export function estadoUnidades(respuestas: readonly Respuesta[], tipo: TipoUnidad): EstadoUnidad[] {
  const porUnidad = new Map<string, Respuesta[]>();
  for (const r of respuestas) {
    const unidades = tipo === 'silaba' ? unidadesDe(r).silabas : unidadesDe(r).grafemas;
    for (const u of new Set(unidades)) porUnidad.set(u, [...(porUnidad.get(u) ?? []), r]);
  }

  return [...porUnidad].map(([unidad, lista]) => {
    const ultimas = [...lista].sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).slice(-INTENTOS_DOMINIO);
    const aciertos = ultimas.filter((r) => r.correcto).length;
    const porcentajeReciente = Math.round((aciertos / ultimas.length) * 100);
    const dias = new Set(ultimas.map((r) => claveDia(r.fecha))).size;
    return {
      unidad,
      porcentajeReciente,
      intentos: lista.length,
      dias,
      dominada: ultimas.length >= INTENTOS_DOMINIO && porcentajeReciente >= PORCENTAJE_DOMINIO && dias >= DIAS_DOMINIO,
    };
  });
}

/** Las que conviene repasar: con suficientes intentos y sin dominar, de peor a mejor. */
export function aReforzar(estados: readonly EstadoUnidad[]): EstadoUnidad[] {
  return estados
    .filter((e) => !e.dominada && e.intentos >= INTENTOS_MINIMOS_REFUERZO)
    .sort((a, b) => a.porcentajeReciente - b.porcentajeReciente || b.intentos - a.intentos);
}

// ─── Tipos de error ─────────────────────────────────────────────────────────

export const NOMBRE_ERROR: Record<string, string> = {
  inversion: 'Inversión',
  espejo: 'Espejo',
  sonoridad: 'Sonoridad',
  omision: 'Omisión',
  comprension: 'Comprensión',
  sustitucion: 'Sustitución',
  intrusa: 'Letra intrusa',
  lectura: 'Lectura en voz alta',
};

export function distribucionErrores(respuestas: readonly Respuesta[]): Array<{ tipo: string; nombre: string; cantidad: number }> {
  const cuenta = new Map<string, number>();
  for (const r of respuestas) {
    if (r.correcto) continue;
    // Los errores de lectura en voz alta (carrera, parejas) no tienen tipo: los marca el adulto.
    const tipo = r.errorTipo ?? 'lectura';
    cuenta.set(tipo, (cuenta.get(tipo) ?? 0) + 1);
  }
  return [...cuenta]
    .map(([tipo, cantidad]) => ({ tipo, nombre: NOMBRE_ERROR[tipo] ?? tipo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

// ─── Evolución semanal y constancia ────────────────────────────────────────

export interface Semana {
  semana: string;
  /** Media de PCPM de la semana (null si no hubo carrera). */
  pcpm: number | null;
  estrellas: number;
  niveles: number;
  sesionesCasa: number;
  sesionesTutoria: number;
  minutosCasa: number;
  minutosTutoria: number;
}

/** Una "sesión" = un día con actividad en ese contexto. */
export function evolucionSemanal(resultados: readonly ResultadoNivel[]): Semana[] {
  const semanas = new Map<string, ResultadoNivel[]>();
  for (const r of resultados) {
    const k = claveSemana(r.fecha);
    semanas.set(k, [...(semanas.get(k) ?? []), r]);
  }
  return [...semanas]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, lista]) => {
      const pcpms = lista.filter((r) => r.pcpm !== undefined).map((r) => r.pcpm as number);
      const de = (c: Contexto) => lista.filter((r) => r.contexto === c);
      const dias = (c: Contexto) => new Set(de(c).map((r) => claveDia(r.fecha))).size;
      const minutos = (c: Contexto) => redondear(de(c).reduce((m, r) => m + r.duracionMs, 0) / 60000);
      return {
        semana,
        pcpm: pcpms.length ? redondear(pcpms.reduce((a, b) => a + b, 0) / pcpms.length) : null,
        estrellas: lista.reduce((e, r) => e + r.estrellas, 0),
        niveles: lista.length,
        sesionesCasa: dias('casa'),
        sesionesTutoria: dias('tutoria'),
        minutosCasa: minutos('casa'),
        minutosTutoria: minutos('tutoria'),
      };
    });
}

// ─── Casa / tutoría ─────────────────────────────────────────────────────────

export interface ResumenContexto {
  contexto: Contexto;
  respuestas: number;
  porcentajeAcierto: number;
  latenciaMedianaMs: number;
  pcpmMedia: number | null;
  sesiones: number;
  minutos: number;
}

export function comparativaContextos(respuestas: readonly Respuesta[], resultados: readonly ResultadoNivel[]): ResumenContexto[] {
  return (['casa', 'tutoria'] as const).map((contexto) => {
    const rs = respuestas.filter((r) => r.contexto === contexto);
    const ns = resultados.filter((r) => r.contexto === contexto);
    const pcpms = ns.filter((r) => r.pcpm !== undefined).map((r) => r.pcpm as number);
    return {
      contexto,
      respuestas: rs.length,
      porcentajeAcierto: rs.length ? Math.round((rs.filter((r) => r.correcto).length / rs.length) * 100) : 0,
      latenciaMedianaMs: Math.round(mediana(rs.map((r) => r.latenciaMs))),
      pcpmMedia: pcpms.length ? redondear(pcpms.reduce((a, b) => a + b, 0) / pcpms.length) : null,
      sesiones: new Set(ns.map((r) => claveDia(r.fecha))).size,
      minutos: redondear(ns.reduce((m, r) => m + r.duracionMs, 0) / 60000),
    };
  });
}
