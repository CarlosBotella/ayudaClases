/**
 * Nivel de REPASO a partir de las unidades "a reforzar" del panel.
 * Es un tren de sílabas con palabras que contienen esas sílabas (o grafemas),
 * con la trampa más formativa de cada una. Se añade al mundo donde viven las
 * palabras y aparece siempre abierto al final del camino.
 */
import type { Contenido, ItemTren, NivelBurbujas, NivelTren } from '../datos/esquemas.ts';
import type { Aleatorio } from '../lib/aleatorio.ts';
import { grafemasDe } from '../lib/clasificador.ts';
import { distractoresSilaba, type Distractor, type TipoError } from '../lib/distractores.ts';

export const MARCA_REPASO = '-repaso';
export const esRepaso = (nivelId: string) => nivelId.includes(MARCA_REPASO);

const PREFERENCIA: TipoError[] = ['inversion', 'espejo', 'sonoridad', 'omision'];

function trampaPara(silaba: string, rnd: Aleatorio): Distractor | undefined {
  const opciones = distractoresSilaba(silaba).filter((d) => !d.texto.includes('q'));
  for (const tipo of PREFERENCIA) {
    const d = rnd.elegir(opciones.filter((o) => o.tipo === tipo));
    if (d) return d;
  }
  return opciones[0];
}

export interface PlanRepaso {
  mundo: number;
  nivel: NivelTren | NivelBurbujas;
  /** Unidades que de verdad se pudieron incluir. */
  unidades: string[];
}

/**
 * @param unidades sílabas o grafemas a reforzar (los peores primero)
 * @param contenidos mundos guardados
 * @param ahora sello de tiempo para el id del nivel
 */
export function crearNivelRepaso(
  unidades: readonly string[],
  contenidos: readonly Contenido[],
  rnd: Aleatorio,
  ahora = Date.now(),
): PlanRepaso | null {
  const palabras = contenidos.flatMap((c) =>
    Object.entries(c.palabras).map(([texto, p]) => ({ texto, silabas: p.silabas, mundo: c.mundo })),
  );
  const items: ItemTren[] = [];
  const incluidas: string[] = [];
  const usadas = new Set<string>();
  let mundo = 0;

  for (const unidad of unidades) {
    if (items.length >= 5) break;
    // Palabras con esa sílaba; si no, con ese grafema.
    const conSilaba = palabras.filter((p) => p.silabas.includes(unidad) && !usadas.has(p.texto));
    const candidatas = conSilaba.length ? conSilaba : palabras.filter((p) => grafemasDe(p.texto).includes(unidad) && !usadas.has(p.texto));
    const p = rnd.elegir(candidatas.filter((c) => c.silabas.length >= 2)) ?? rnd.elegir(candidatas);
    if (!p) continue;

    const silabaClave = p.silabas.find((s) => s === unidad) ?? p.silabas.find((s) => grafemasDe(s).includes(unidad)) ?? p.silabas[0]!;
    const trampa = trampaPara(silabaClave, rnd);
    usadas.add(p.texto);
    incluidas.push(unidad);
    mundo = Math.max(mundo, p.mundo);
    items.push({
      piezas: p.silabas,
      huecos: p.silabas.map((_, i) => i),
      trampas: trampa && !p.silabas.includes(trampa.texto) ? [trampa] : [],
      escena: { elementos: [{ palabra: p.texto, escala: 1, copias: 1 }] },
      lectura: p.texto,
      unidad: 'silaba',
    });
  }

  if (items.length > 0) {
    return {
      mundo,
      unidades: incluidas,
      nivel: { id: `m${mundo}${MARCA_REPASO}-${ahora}`, titulo: 'Repaso', dificultad: 3, mecanica: 'tren', items },
    };
  }
  return null;
}

/** Sustituye el repaso anterior de un mundo (si lo había) por el nuevo. */
export function conRepaso(contenido: Contenido, nivel: Contenido['niveles'][number]): Contenido['niveles'] {
  return [...contenido.niveles.filter((n) => !esRepaso(n.id)), nivel];
}

/**
 * Niveles que ve un alumno en un mundo: los comunes del mundo y, al final, su
 * repaso personal (guardado en su plan). Se ignoran repasos antiguos que se
 * hubieran guardado en el mundo.
 */
export function nivelesDelAlumno(contenido: Contenido, repasos: Readonly<Record<string, Contenido['niveles'][number]>>): Contenido['niveles'] {
  const propio = repasos[String(contenido.mundo)];
  return [...contenido.niveles.filter((n) => !esRepaso(n.id)), ...(propio ? [propio] : [])];
}
