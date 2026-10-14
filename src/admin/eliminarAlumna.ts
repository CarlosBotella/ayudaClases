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

export async function eliminarAlumna(sid: string, progreso: (m: string) => void): Promise<ResumenBorrado> {
  const db = dbTutor();
  progreso('Preparando…');
  const respuestas = await borrarTodo(collection(db, 'students', sid, 'attempts'), 'respuestas', progreso);
  const resultados = await borrarTodo(collection(db, 'students', sid, 'levelAttempts'), 'resultados', progreso);
  const tablets = await borrarTodo(query(collection(db, 'devices'), where('studentId', '==', sid)), 'tablets vinculadas', progreso);
  await borrarTodo(query(collection(db, 'pairingCodes'), where('studentId', '==', sid)), 'códigos', progreso);
  progreso('Borrando su plan y su ficha…');
  await deleteDoc(doc(db, 'planes', sid));
  await deleteDoc(doc(db, 'students', sid));
  return { respuestas, resultados, tablets };
}
