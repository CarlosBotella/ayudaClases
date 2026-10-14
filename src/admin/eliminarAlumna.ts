/**
 * Elimina a una alumna y TODOS sus datos (Firestore no borra las
 * subcolecciones solo): respuestas, resultados, plan, tablets vinculadas y
 * códigos de vinculación. La ficha de la alumna se borra la ÚLTIMA: si algo
 * falla a medias, sigue apareciendo en el panel y basta con repetir.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type Query,
} from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';

/** Firestore admite hasta 500 operaciones por lote. */
const LOTE = 400;

async function borrarTodo(consulta: Query, nombre: string, progreso: (m: string) => void): Promise<number> {
  const db = dbTutor();
  const snap = await getDocs(consulta);
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += LOTE) {
    const lote = writeBatch(db);
    docs.slice(i, i + LOTE).forEach((d) => lote.delete(d.ref));
    await lote.commit();
    progreso(`Borrando ${nombre}: ${Math.min(i + LOTE, docs.length)} de ${docs.length}…`);
  }
  return docs.length;
}

export interface ResumenBorrado {
  respuestas: number;
  resultados: number;
  tablets: number;
}

/**
 * Tablets y códigos: el administrador filtra por alumno; un tutor solo puede
 * consultar los que lo incluyen a él (y aquí se filtra por alumno).
 */
async function borrarDeAlumno(
  coleccion: 'devices' | 'pairingCodes',
  sid: string,
  adulto: { email: string; esAdmin: boolean },
  nombre: string,
  progreso: (m: string) => void,
): Promise<number> {
  const db = dbTutor();
  const base = collection(db, coleccion);
  if (adulto.esAdmin) return borrarTodo(query(base, where('studentId', '==', sid)), nombre, progreso);
  const snap = await getDocs(query(base, where('tutores', 'array-contains', adulto.email)));
  const suyos = snap.docs.filter((d) => d.data()['studentId'] === sid);
  for (const d of suyos) await deleteDoc(d.ref);
  return suyos.length;
}

export async function eliminarAlumna(
  sid: string,
  progreso: (m: string) => void,
  adulto: { email: string; esAdmin: boolean },
): Promise<ResumenBorrado> {
  const db = dbTutor();
  progreso('Preparando…');
  const respuestas = await borrarTodo(collection(db, 'students', sid, 'attempts'), 'respuestas', progreso);
  const resultados = await borrarTodo(collection(db, 'students', sid, 'levelAttempts'), 'resultados', progreso);
  await borrarTodo(collection(db, 'students', sid, 'contenido'), 'sus mundos', progreso);
  const tablets = await borrarDeAlumno('devices', sid, adulto, 'tablets vinculadas', progreso);
  await borrarDeAlumno('pairingCodes', sid, adulto, 'códigos', progreso);
  progreso('Borrando su plan y su ficha…');
  await deleteDoc(doc(db, 'planes', sid));
  await deleteDoc(doc(db, 'students', sid));
  return { respuestas, resultados, tablets };
}
