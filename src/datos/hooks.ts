/**
 * Lectura de datos para la tablet de la niña. Todo usa onSnapshot sobre la
 * caché persistente: funciona sin conexión con lo último descargado.
 */
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { dbNina } from '../firebase.ts';
import { NUM_MUNDOS } from '../lib/clasificador.ts';
import { PROGRESO_VACIO, resumirProgreso, type ResumenProgreso } from '../lib/progreso.ts';
import { ContenidoZ, IntentoNivelZ, type Contenido, type IntentoNivel } from './esquemas.ts';

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
        snap.forEach((d) => {
          const r = IntentoNivelZ.safeParse(d.data());
          if (r.success) intentos.push(r.data);
        });
        setResumen(resumirProgreso(intentos));
      },
      (e) => console.warn('No se pudo leer el progreso', e),
    );
  }, [studentId]);

  return resumen;
}
