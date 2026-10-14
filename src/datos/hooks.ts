/**
 * Lectura de datos para la tablet de la niña. Todo usa onSnapshot sobre la
 * caché persistente: funciona sin conexión con lo último descargado.
 */
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { dbNina } from '../firebase.ts';
import { NUM_MUNDOS } from '../lib/clasificador.ts';
import { PROGRESO_VACIO, resumirProgreso, type PartidaRegistrada, type ResumenProgreso } from '../lib/progreso.ts';
import { calcularRetos, type EstadoReto } from '../lib/adaptativo.ts';
import { ContenidoZ, IntentoNivelZ, PlanZ, type Contenido, type IntentoNivel, type Mecanica, type Plan } from './esquemas.ts';

export type EstadoCarga<T> = { tipo: 'cargando' } | { tipo: 'vacio' } | { tipo: 'listo'; datos: T };

/** Contenido de un mundo, validado con Zod. */
export function useContenido(mundo: number): EstadoCarga<Contenido> {
  const [estado, setEstado] = useState<EstadoCarga<Contenido>>({ tipo: 'cargando' });

  useEffect(() => {
    setEstado({ tipo: 'cargando' });
    return onSnapshot(
      doc(dbNina(), 'contenido', `mundo-${mundo}`),
      (snap) => {
        if (!snap.exists()) return setEstado({ tipo: 'vacio' });
        const r = ContenidoZ.safeParse(snap.data());
        if (!r.success) {
          console.warn(`contenido/mundo-${mundo} no es válido`, r.error.issues);
          return setEstado({ tipo: 'vacio' });
        }
        setEstado({ tipo: 'listo', datos: r.data });
      },
      () => setEstado({ tipo: 'vacio' }),
    );
  }, [mundo]);

  return estado;
}

/** Los 5 mundos a la vez (para el mapa y el álbum). null = aún no generado. */
export function useTodosLosMundos(): { cargando: boolean; mundos: Record<number, Contenido | null> } {
  const [mundos, setMundos] = useState<Record<number, Contenido | null | undefined>>({});

  useEffect(() => {
    const cancelar = Array.from({ length: NUM_MUNDOS }, (_, i) => i + 1).map((n) =>
      onSnapshot(
        doc(dbNina(), 'contenido', `mundo-${n}`),
        (snap) => {
          const r = snap.exists() ? ContenidoZ.safeParse(snap.data()) : null;
          setMundos((m) => ({ ...m, [n]: r?.success ? r.data : null }));
        },
        () => setMundos((m) => ({ ...m, [n]: null })),
      ),
    );
    return () => cancelar.forEach((c) => c());
  }, []);

  const cargando = Object.keys(mundos).length < NUM_MUNDOS;
  const limpios: Record<number, Contenido | null> = {};
  for (const [k, v] of Object.entries(mundos)) limpios[Number(k)] = v ?? null;
  return { cargando, mundos: limpios };
}

/** Progreso de la alumna (estrellas, pegatinas, fantasma). */
export function useProgreso(studentId: string | undefined): ResumenProgreso {
  const [resumen, setResumen] = useState<ResumenProgreso>(PROGRESO_VACIO);

  useEffect(() => {
    if (!studentId) return;
    const q = query(collection(dbNina(), 'students', studentId, 'levelAttempts'), orderBy('completadoEn'));
    return onSnapshot(
      q,
      (snap) => {
        const intentos: IntentoNivel[] = [];
        const partidas: PartidaRegistrada[] = [];
        snap.forEach((d) => {
          const r = IntentoNivelZ.safeParse(d.data());
          if (!r.success) return;
          intentos.push(r.data);
          const fecha = r.data.completadoEn instanceof Timestamp ? r.data.completadoEn.toDate() : new Date();
          partidas.push({
            mecanica: r.data.mecanica,
            puntuacion: r.data.puntuacion,
            fecha,
            nivelId: r.data.nivelId,
            mundo: r.data.mundo,
            contexto: r.data.contexto,
          });
        });
        setResumen({ ...resumirProgreso(intentos), partidas });
      },
      (e) => console.warn('No se pudo leer el progreso', e),
    );
  }, [studentId]);

  return resumen;
}

/** Plan de la alumna (reto fijado por el tutor y deberes). null si no hay. */
export function usePlan(studentId: string | undefined): Plan | null {
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    if (!studentId) return;
    return onSnapshot(
      doc(dbNina(), 'planes', studentId),
      (snap) => {
        const r = snap.exists() ? PlanZ.safeParse(snap.data()) : null;
        setPlan(r?.success ? r.data : null);
      },
      () => setPlan(null),
    );
  }, [studentId]);
  return plan;
}

/** Escalón de reto de cada juego para la alumna de esta tablet. */
export function useRetos(studentId: string | undefined): Partial<Record<Mecanica, EstadoReto>> {
  const progreso = useProgreso(studentId);
  const plan = usePlan(studentId);
  return useMemo(() => calcularRetos(progreso.partidas, plan?.retoFijo ?? {}), [progreso.partidas, plan]);
}
