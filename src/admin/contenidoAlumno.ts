import { getDoc } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { ContenidoZ, type Contenido } from '../datos/esquemas.ts';
import { refContenido } from '../datos/rutasContenido.ts';
import { MUNDOS } from '../lib/clasificador.ts';

/** Los mundos que ve un alumno: el propio de cada mundo o, si no tiene, el común. */
export async function contenidosDelAlumno(sid: string): Promise<Contenido[]> {
  const leer = async (mundo: number, alumno: string | null) => {
    const snap = await getDoc(refContenido(dbTutor(), mundo, alumno));
    const r = snap.exists() ? ContenidoZ.safeParse(snap.data()) : null;
    return r?.success ? r.data : null;
  };
  const porMundo = await Promise.all(MUNDOS.map(async (m) => (await leer(m.n, sid)) ?? (await leer(m.n, null))));
  return porMundo.filter((c): c is Contenido => c !== null);
}
