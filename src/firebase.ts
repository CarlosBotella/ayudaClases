/**
 * Conexión con Firebase (plan Spark, sin Cloud Functions).
 *
 * Hay DOS "apps" de Firebase en el mismo navegador:
 *  - la de la NIÑA: sesión anónima de la tablet + Firestore con caché persistente
 *    (funciona sin conexión y sincroniza sola al volver la red);
 *  - la del TUTOR: sesión con email, independiente. Así el tutor puede entrar al
 *    panel en la tablet de la niña sin romper la vinculación de esa tablet.
 *
 * Los valores de configuración web NO son secretos: la seguridad la dan las
 * reglas de Firestore (firestore.rules).
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyD7FaJ0vbMx1G7aTeB0lerrr_18CU8Wt8o',
  authDomain: 'viaje-lector1.firebaseapp.com',
  projectId: 'viaje-lector1',
  storageBucket: 'viaje-lector1.firebasestorage.app',
  messagingSenderId: '638949723348',
  appId: '1:638949723348:web:a074ea96ad9e84d637ff41',
};

/** false hasta que se peguen aquí los valores de la consola de Firebase. */
export const firebaseConfigurado = firebaseConfig.apiKey !== '' && firebaseConfig.projectId !== '';

const NOMBRE_APP_TUTOR = 'tutor';

function obtenerApp(nombre?: string): FirebaseApp {
  if (!firebaseConfigurado) throw new Error('Firebase no está configurado (src/firebase.ts)');
  const existe = getApps().some((a) => a.name === (nombre ?? '[DEFAULT]'));
  if (existe) return nombre ? getApp(nombre) : getApp();
  return nombre ? initializeApp(firebaseConfig, nombre) : initializeApp(firebaseConfig);
}

let dbNinaCache: Firestore | null = null;
let dbTutorCache: Firestore | null = null;

/** Auth de la tablet (sesión anónima). */
export function authNina(): Auth {
  return getAuth(obtenerApp());
}

/** Firestore de la tablet: caché local persistente, compartida entre pestañas. */
export function dbNina(): Firestore {
  dbNinaCache ??= initializeFirestore(obtenerApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  return dbNinaCache;
}

/** Auth del tutor (email y contraseña). */
export function authTutor(): Auth {
  return getAuth(obtenerApp(NOMBRE_APP_TUTOR));
}

/** Firestore del tutor: en memoria (el panel se usa con conexión). */
export function dbTutor(): Firestore {
  dbTutorCache ??= initializeFirestore(obtenerApp(NOMBRE_APP_TUTOR), {
    localCache: memoryLocalCache(),
    ignoreUndefinedProperties: true,
  });
  return dbTutorCache;
}
