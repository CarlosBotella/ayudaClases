import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { AlumnaZ } from '../datos/esquemas.ts';
import { useAdulto } from '../sesion/SesionTutor.tsx';

export interface AlumnoFila {
  id: string;
  nombre: string;
  tutores: string[];
  creado: number;
}

/**
 * Alumnos visibles para quien está en el panel: el administrador ve todos;
 * cada tutor, solo los que lo tienen en su lista de tutores.
 * (Se ordena aquí para no necesitar índices compuestos en Firestore.)
 */
export function useAlumnas(): { alumnas: AlumnoFila[]; recargar: () => void } {
  const { email, esAdmin } = useAdulto();
  const [alumnas, setAlumnas] = useState<AlumnoFila[]>([]);

  const recargar = useCallback(() => {
    const base = collection(dbTutor(), 'students');
    const consulta = esAdmin ? base : query(base, where('tutores', 'array-contains', email));
    void getDocs(consulta).then((snap) => {
      const filas: AlumnoFila[] = [];
      snap.forEach((d) => {
        const r = AlumnaZ.safeParse(d.data());
        if (r.success) {
          const creado = r.data.creado instanceof Timestamp ? r.data.creado.toMillis() : 0;
          filas.push({ id: d.id, nombre: r.data.nombre, tutores: r.data.tutores, creado });
        }
      });
      setAlumnas(filas.sort((a, b) => a.creado - b.creado));
    });
  }, [email, esAdmin]);

  useEffect(recargar, [recargar]);
  return { alumnas, recargar };
}

/** Nombre de cada juego, para el panel. */
export const NOMBRE_JUEGO: Record<string, string> = {
  intrusa: 'Letra intrusa',
  burbujas: 'Pesca de burbujas',
  tren: 'Tren de sílabas',
  detective: 'Detective de dibujos',
  carrera: 'Carrera del cohete',
  pillado: '¡Pillado! (con el profe)',
  dictado: 'Dictado mágico (con el profe)',
  parejas: 'Parejas por turnos (con el profe)',
  trazo: 'Traza la letra',
  cuaderno: 'Dictado al cuaderno',
};
