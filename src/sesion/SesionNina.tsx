/**
 * Sesión de la tablet de la niña.
 *
 * 1. Inicia sesión anónima (una vez; Firebase la recuerda).
 * 2. Escucha devices/{uid}: si existe, la tablet está vinculada a una alumna.
 * 3. Si no, la pantalla de inicio pide el código de 6 dígitos que genera el tutor.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { authNina, dbNina, firebaseConfigurado } from '../firebase.ts';
import { CodigoVinculacionZ, DispositivoZ, type Dispositivo } from '../datos/esquemas.ts';

export type EstadoNina =
  | { tipo: 'sin-configurar' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin-vincular'; uid: string }
  | { tipo: 'lista'; uid: string; dispositivo: Dispositivo };

interface ValorSesionNina {
  estado: EstadoNina;
  /** Vincula la tablet con un código. Devuelve un mensaje de error o null si fue bien. */
  vincular: (codigo: string) => Promise<string | null>;
  desvincular: () => Promise<void>;
  /** Momento en que empezó la sesión de juego actual (para la celebración de ~10 min). */
  inicioSesion: number;
  reiniciarSesion: () => void;
}

const Contexto = createContext<ValorSesionNina | null>(null);

export const DURACION_SESION_MS = 10 * 60 * 1000;

export function SesionNinaProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoNina>(
    firebaseConfigurado ? { tipo: 'cargando' } : { tipo: 'sin-configurar' },
  );
  const [inicioSesion, setInicioSesion] = useState(() => Date.now());
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigurado) return;
    const auth = authNina();
    let dejarDeEscuchar: (() => void) | null = null;

    const cancelarAuth = onAuthStateChanged(auth, (usuario) => {
      dejarDeEscuchar?.();
      dejarDeEscuchar = null;

      if (!usuario) {
        signInAnonymously(auth).catch(() =>
          setEstado({
            tipo: 'error',
            mensaje: 'La primera vez la tablet necesita Internet para prepararse.',
          }),
        );
        return;
      }

      uidRef.current = usuario.uid;
      dejarDeEscuchar = onSnapshot(
        doc(dbNina(), 'devices', usuario.uid),
        (snap) => {
          const datos = snap.exists() ? DispositivoZ.safeParse(snap.data()) : null;
          if (datos?.success) setEstado({ tipo: 'lista', uid: usuario.uid, dispositivo: datos.data });
          else setEstado({ tipo: 'sin-vincular', uid: usuario.uid });
        },
        () => setEstado({ tipo: 'sin-vincular', uid: usuario.uid }),
      );
    });

    return () => {
      cancelarAuth();
      dejarDeEscuchar?.();
    };
  }, []);

  const vincular = useCallback(async (codigo: string): Promise<string | null> => {
    const uid = uidRef.current;
    if (!uid) return 'La tablet aún se está preparando. Espera un momento.';
    if (!/^\d{6}$/.test(codigo)) return 'El código tiene 6 números.';

    try {
      const snap = await getDoc(doc(dbNina(), 'pairingCodes', codigo));
      const datos = snap.exists() ? CodigoVinculacionZ.safeParse(snap.data()) : null;
      if (!datos?.success) return 'Ese código no existe. Revisa los números.';

      const expira = datos.data.expira;
      if (expira instanceof Timestamp && expira.toMillis() < Date.now()) {
        return 'Ese código ha caducado. Genera otro en el panel del tutor.';
      }

      await setDoc(doc(dbNina(), 'devices', uid), {
        studentId: datos.data.studentId,
        nombre: datos.data.nombre,
        contexto: datos.data.contexto,
        codigo,
        vinculado: serverTimestamp(),
        // Copia de los tutores del alumno: así cada tutor ve solo sus tablets.
        tutores: datos.data.tutores,
      });
      return null;
    } catch {
      return 'No se pudo vincular. Comprueba la conexión a Internet.';
    }
  }, []);

  const desvincular = useCallback(async () => {
    const uid = uidRef.current;
    if (uid) await deleteDoc(doc(dbNina(), 'devices', uid));
  }, []);

  const reiniciarSesion = useCallback(() => setInicioSesion(Date.now()), []);

  const valor = useMemo(
    () => ({ estado, vincular, desvincular, inicioSesion, reiniciarSesion }),
    [estado, vincular, desvincular, inicioSesion, reiniciarSesion],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesionNina(): ValorSesionNina {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useSesionNina fuera de SesionNinaProvider');
  return valor;
}

/** Atajo para pantallas que solo existen con la tablet vinculada. */
export function useDispositivo(): { uid: string; dispositivo: Dispositivo } | null {
  const { estado } = useSesionNina();
  return estado.tipo === 'lista' ? { uid: estado.uid, dispositivo: estado.dispositivo } : null;
}
