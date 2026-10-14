/**
 * Sesión de los adultos del panel (email + contraseña). Es una app de Firebase
 * separada de la de la niña: entrar aquí no desvincula la tablet.
 *
 * Roles:
 *  - administrador (EMAIL_ADMIN): ve todo, da de alta tutores, genera los mundos;
 *  - tutor: email dado de alta en tutores/{email} y activo; ve solo a sus alumnos.
 * Cualquiera puede crearse una cuenta, pero sin estar dado de alta no ve nada
 * (lo garantizan las reglas de Firestore, no solo esta pantalla).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { authTutor, dbTutor, firebaseConfigurado } from '../firebase.ts';
import { EMAIL_ADMIN, TutorZ } from '../datos/esquemas.ts';

export type EstadoTutor =
  | { tipo: 'sin-configurar' }
  | { tipo: 'cargando' }
  | { tipo: 'fuera' }
  | { tipo: 'sin-verificar'; usuario: User }
  /** Cuenta correcta, pero el administrador no la ha dado de alta (o la ha desactivado). */
  | { tipo: 'sin-permiso'; email: string }
  | { tipo: 'dentro'; usuario: User; email: string; esAdmin: boolean; nombre: string };

interface ValorSesionTutor {
  estado: EstadoTutor;
  entrar: (email: string, contrasena: string) => Promise<string | null>;
  crearCuenta: (email: string, contrasena: string) => Promise<string | null>;
  salir: () => Promise<void>;
  enviarVerificacion: () => Promise<string | null>;
  /** Vuelve a consultar si el email ya está verificado y si tiene permiso. */
  comprobar: () => Promise<void>;
  recuperarContrasena: (email: string) => Promise<string | null>;
}

const Contexto = createContext<ValorSesionTutor | null>(null);

export const normalizarEmail = (e: string) => e.trim().toLowerCase();

async function calcularEstado(usuario: User | null): Promise<EstadoTutor> {
  if (!usuario) return { tipo: 'fuera' };
  if (!usuario.emailVerified) return { tipo: 'sin-verificar', usuario };
  const email = normalizarEmail(usuario.email ?? '');
  if (email === EMAIL_ADMIN) return { tipo: 'dentro', usuario, email, esAdmin: true, nombre: 'Administrador' };
  try {
    const snap = await getDoc(doc(dbTutor(), 'tutores', email));
    const ficha = snap.exists() ? TutorZ.safeParse(snap.data()) : null;
    if (ficha?.success && ficha.data.activo) {
      return { tipo: 'dentro', usuario, email, esAdmin: false, nombre: ficha.data.nombre || email };
    }
  } catch {
    // Sin permiso para leer su ficha: no está dado de alta.
  }
  return { tipo: 'sin-permiso', email };
}

/** Traduce los códigos de error de Firebase a mensajes claros. */
function mensajeError(e: unknown): string {
  const codigo = typeof e === 'object' && e && 'code' in e ? String(e.code) : '';
  if (codigo.includes('invalid-credential') || codigo.includes('wrong-password') || codigo.includes('user-not-found'))
    return 'Email o contraseña incorrectos.';
  if (codigo.includes('email-already-in-use')) return 'Ya existe una cuenta con ese email: usa «Entrar».';
  if (codigo.includes('weak-password')) return 'La contraseña es demasiado corta (mínimo 6 caracteres).';
  if (codigo.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos.';
  if (codigo.includes('network')) return 'Sin conexión a Internet.';
  if (codigo.includes('invalid-email')) return 'El email no es válido.';
  if (codigo.includes('operation-not-allowed')) return 'El alta de cuentas está desactivada en Firebase.';
  return 'No se pudo completar. Inténtalo de nuevo.';
}

export function SesionTutorProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoTutor>(
    firebaseConfigurado ? { tipo: 'cargando' } : { tipo: 'sin-configurar' },
  );

  useEffect(() => {
    if (!firebaseConfigurado) return;
    return onAuthStateChanged(authTutor(), (u) => {
      void calcularEstado(u).then(setEstado);
    });
  }, []);

  const entrar = useCallback(async (email: string, contrasena: string) => {
    try {
      await signInWithEmailAndPassword(authTutor(), normalizarEmail(email), contrasena);
      return null;
    } catch (e) {
      return mensajeError(e);
    }
  }, []);

  const crearCuenta = useCallback(async (email: string, contrasena: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(authTutor(), normalizarEmail(email), contrasena);
      await sendEmailVerification(cred.user);
      return null;
    } catch (e) {
      return mensajeError(e);
    }
  }, []);

  const salir = useCallback(async () => {
    await signOut(authTutor());
  }, []);

  const enviarVerificacion = useCallback(async () => {
    const usuario = authTutor().currentUser;
    if (!usuario) return 'No hay sesión.';
    try {
      await sendEmailVerification(usuario);
      return null;
    } catch (e) {
      return mensajeError(e);
    }
  }, []);

  const comprobar = useCallback(async () => {
    const usuario = authTutor().currentUser;
    if (!usuario) return;
    await usuario.reload();
    // Token nuevo: las reglas leen email_verified del token, no del usuario.
    await usuario.getIdToken(true);
    setEstado(await calcularEstado(authTutor().currentUser));
  }, []);

  const recuperarContrasena = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(authTutor(), normalizarEmail(email));
      return null;
    } catch (e) {
      return mensajeError(e);
    }
  }, []);

  const valor = useMemo(
    () => ({ estado, entrar, crearCuenta, salir, enviarVerificacion, comprobar, recuperarContrasena }),
    [estado, entrar, crearCuenta, salir, enviarVerificacion, comprobar, recuperarContrasena],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesionTutor(): ValorSesionTutor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useSesionTutor fuera de SesionTutorProvider');
  return valor;
}

/** Datos del adulto que está dentro del panel (solo usar bajo AdminMarco). */
export function useAdulto(): { email: string; esAdmin: boolean; nombre: string } {
  const { estado } = useSesionTutor();
  if (estado.tipo !== 'dentro') throw new Error('useAdulto sin sesión de tutor');
  return { email: estado.email, esAdmin: estado.esAdmin, nombre: estado.nombre };
}
