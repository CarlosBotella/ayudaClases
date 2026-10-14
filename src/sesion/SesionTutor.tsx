/**
 * Sesión del tutor (email + contraseña). Es una app de Firebase separada de la
 * de la niña: entrar aquí no desvincula la tablet.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { authTutor, firebaseConfigurado } from '../firebase.ts';
import { EMAIL_TUTOR } from '../datos/esquemas.ts';

export type EstadoTutor =
  | { tipo: 'sin-configurar' }
  | { tipo: 'cargando' }
  | { tipo: 'fuera' }
  | { tipo: 'otra-cuenta'; email: string }
  | { tipo: 'sin-verificar'; usuario: User }
  | { tipo: 'dentro'; usuario: User };

interface ValorSesionTutor {
  estado: EstadoTutor;
  entrar: (email: string, contrasena: string) => Promise<string | null>;
  salir: () => Promise<void>;
  enviarVerificacion: () => Promise<string | null>;
  /** Vuelve a consultar si el email ya está verificado. */
  comprobarVerificacion: () => Promise<void>;
  recuperarContrasena: (email: string) => Promise<string | null>;
}

const Contexto = createContext<ValorSesionTutor | null>(null);

function calcularEstado(usuario: User | null): EstadoTutor {
  if (!usuario) return { tipo: 'fuera' };
  if (usuario.email?.toLowerCase() !== EMAIL_TUTOR) return { tipo: 'otra-cuenta', email: usuario.email ?? '' };
  if (!usuario.emailVerified) return { tipo: 'sin-verificar', usuario };
  return { tipo: 'dentro', usuario };
}

/** Traduce los códigos de error de Firebase a mensajes claros. */
function mensajeError(e: unknown): string {
  const codigo = typeof e === 'object' && e && 'code' in e ? String(e.code) : '';
  if (codigo.includes('invalid-credential') || codigo.includes('wrong-password') || codigo.includes('user-not-found'))
    return 'Email o contraseña incorrectos.';
  if (codigo.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos.';
  if (codigo.includes('network')) return 'Sin conexión a Internet.';
  if (codigo.includes('invalid-email')) return 'El email no es válido.';
  return 'No se pudo completar. Inténtalo de nuevo.';
}

export function SesionTutorProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoTutor>(
    firebaseConfigurado ? { tipo: 'cargando' } : { tipo: 'sin-configurar' },
  );

  useEffect(() => {
    if (!firebaseConfigurado) return;
    return onAuthStateChanged(authTutor(), (u) => setEstado(calcularEstado(u)));
  }, []);

  const entrar = useCallback(async (email: string, contrasena: string) => {
    try {
      await signInWithEmailAndPassword(authTutor(), email.trim(), contrasena);
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

  const comprobarVerificacion = useCallback(async () => {
    const usuario = authTutor().currentUser;
    if (!usuario) return;
    await usuario.reload();
    // Token nuevo: las reglas leen email_verified del token, no del usuario.
    await usuario.getIdToken(true);
    setEstado(calcularEstado(authTutor().currentUser));
  }, []);

  const recuperarContrasena = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(authTutor(), email.trim());
      return null;
    } catch (e) {
      return mensajeError(e);
    }
  }, []);

  const valor = useMemo(
    () => ({ estado, entrar, salir, enviarVerificacion, comprobarVerificacion, recuperarContrasena }),
    [estado, entrar, salir, enviarVerificacion, comprobarVerificacion, recuperarContrasena],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesionTutor(): ValorSesionTutor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useSesionTutor fuera de SesionTutorProvider');
  return valor;
}
