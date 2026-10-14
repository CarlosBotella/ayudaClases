/**
 * Dónde vive el contenido de un mundo:
 *  - de un alumno:  students/{sid}/contenido/mundo-{n}  (lo eligen sus tutores)
 *  - común:         contenido/mundo-{n}                 (lo genera el administrador; es el de por defecto)
 * La tablet usa el del alumno si existe y, si no, el común.
 */
import { doc, type DocumentReference, type Firestore } from 'firebase/firestore';

export function refContenido(db: Firestore, mundo: number, alumno?: string | null): DocumentReference {
  return alumno ? doc(db, 'students', alumno, 'contenido', `mundo-${mundo}`) : doc(db, 'contenido', `mundo-${mundo}`);
}
