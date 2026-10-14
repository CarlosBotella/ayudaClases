import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { AlumnaZ } from '../datos/esquemas.ts';

/** Lista de alumnas para los selectores del panel. */
export function useAlumnas(): Array<{ id: string; nombre: string }> {
  const [alumnas, setAlumnas] = useState<Array<{ id: string; nombre: string }>>([]);
  useEffect(() => {
    void getDocs(query(collection(dbTutor(), 'students'), orderBy('creado'))).then((snap) => {
      const filas: Array<{ id: string; nombre: string }> = [];
      snap.forEach((d) => {
        const r = AlumnaZ.safeParse(d.data());
        if (r.success) filas.push({ id: d.id, nombre: r.data.nombre });
      });
      setAlumnas(filas);
    });
  }, []);
  return alumnas;
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
