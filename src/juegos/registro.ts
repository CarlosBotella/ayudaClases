/**
 * Registro de lo que hace la niña. Cada respuesta es un documento nuevo en
 * students/{sid}/attempts (solo se añade). Las escrituras no se esperan:
 * sin conexión quedan en la cola de Firestore y se envían al volver la red.
 */
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import type { Contexto, Mecanica, TipoErrorDatos } from '../datos/esquemas.ts';

export interface DatosRespuesta {
  /** Lo que se presentaba (palabra, sílaba o frase). */
  item: string;
  unidadObjetivo: string;
  patron: string;
  respuesta: string;
  correcto: boolean;
  errorTipo: TipoErrorDatos | null;
  latenciaMs: number;
  ayudas: number;
  intentoN: number;
}

export type Registrar = (datos: DatosRespuesta) => void;

export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function crearRegistrador(opciones: {
  db: Firestore;
  studentId: string;
  contexto: Contexto;
  mecanica: Mecanica;
  levelAttemptId: string;
}): Registrar {
  const { db, studentId, contexto, mecanica, levelAttemptId } = opciones;
  return (datos) => {
    const ref = doc(db, 'students', studentId, 'attempts', nuevoId());
    setDoc(ref, {
      levelAttemptId,
      mecanica,
      ...datos,
      latenciaMs: Math.round(datos.latenciaMs),
      contexto,
      creadoEn: Timestamp.now(),
    }).catch((e: unknown) => console.warn('No se pudo guardar un intento', e));
  };
}
