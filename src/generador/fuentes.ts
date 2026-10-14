/**
 * Fuentes públicas del generador (comprobadas: ambas responden con CORS abierto).
 *  - Frecuencias del español (FrequencyWords, subtítulos 2018): "palabra frecuencia" por línea.
 *  - ARASAAC: listado completo de pictogramas en español (~8 MB, ~14.000 pictogramas).
 */
import { z } from 'zod';
import { normalizar } from '../lib/silabas.ts';

export const URL_FRECUENCIAS =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt';
export const URL_PICTOGRAMAS = 'https://api.arasaac.org/v1/pictograms/all/es';

export const urlPictograma = (id: number): string =>
  `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

/** Tipos de palabra de ARASAAC (comprobado sobre el listado real). */
export const TIPO_ARASAAC = {
  nombrePropio: 1,
  nombreComun: 2,
  verbo: 3,
  adjetivo: 4,
  social: 5,
  otros: 6,
} as const;

/** Palabra → posición en el ranking de frecuencia (1 = la más frecuente). */
export function parsearFrecuencias(texto: string, maximo = 15000): Map<string, number> {
  const ranking = new Map<string, number>();
  for (const linea of texto.split('\n')) {
    if (ranking.size >= maximo) break;
    const palabra = normalizar(linea.split(' ')[0] ?? '');
    if (palabra && !ranking.has(palabra)) ranking.set(palabra, ranking.size + 1);
  }
  return ranking;
}

const PictogramaZ = z.object({
  _id: z.number(),
  sex: z.boolean().optional(),
  violence: z.boolean().optional(),
  keywords: z
    .array(z.object({ keyword: z.string().optional(), type: z.number().optional() }))
    .default([]),
});

export interface InfoPictograma {
  id: number;
  /** true si la palabra es nombre común en ARASAAC (si no, nombre propio). */
  comun: boolean;
}

/**
 * Índice palabra → pictograma. Solo nombres comunes y propios (lo dibujable),
 * sin pictogramas marcados como sexuales o violentos.
 * Si una palabra tiene varios, gana el que la tiene como PRIMERA palabra clave
 * (su significado principal) y, a igualdad, el de id más bajo.
 */
export function indexarPictogramas(datos: unknown): Map<string, InfoPictograma> {
  const lista = Array.isArray(datos) ? datos : [];
  const mejor = new Map<string, InfoPictograma & { prioridad: number }>();

  for (const bruto of lista) {
    const p = PictogramaZ.safeParse(bruto);
    if (!p.success || p.data.sex || p.data.violence) continue;

    p.data.keywords.forEach((k, indice) => {
      const tipo = k.type;
      if (tipo !== TIPO_ARASAAC.nombreComun && tipo !== TIPO_ARASAAC.nombrePropio) return;
      const palabra = normalizar(k.keyword ?? '');
      if (!palabra) return;

      const prioridad = (indice === 0 ? 0 : 1_000_000) + p.data._id;
      const actual = mejor.get(palabra);
      // Un nombre común siempre gana a un propio con la misma palabra.
      const comun = tipo === TIPO_ARASAAC.nombreComun;
      if (!actual || (comun && !actual.comun) || (comun === actual.comun && prioridad < actual.prioridad)) {
        mejor.set(palabra, { id: p.data._id, comun, prioridad });
      }
    });
  }

  return new Map([...mejor].map(([palabra, { id, comun }]) => [palabra, { id, comun }]));
}

/** Descarga las dos fuentes. `progreso` recibe mensajes para mostrar en pantalla. */
export async function descargarFuentes(progreso: (mensaje: string) => void): Promise<{
  frecuencias: Map<string, number>;
  pictogramas: Map<string, InfoPictograma>;
}> {
  progreso('Descargando la lista de palabras más frecuentes…');
  const respFrec = await fetch(URL_FRECUENCIAS);
  if (!respFrec.ok) throw new Error(`Frecuencias: HTTP ${respFrec.status}`);
  const frecuencias = parsearFrecuencias(await respFrec.text());

  progreso('Descargando los pictogramas de ARASAAC (unos 8 MB, puede tardar)…');
  const respPic = await fetch(URL_PICTOGRAMAS);
  if (!respPic.ok) throw new Error(`ARASAAC: HTTP ${respPic.status}`);
  const pictogramas = indexarPictogramas(await respPic.json());

  return { frecuencias, pictogramas };
}
