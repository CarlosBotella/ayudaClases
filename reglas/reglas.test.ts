/**
 * Tests de firestore.rules contra el emulador de Firestore.
 * Cada `it` es un caso de la tabla "permitido / denegado".
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const TUTOR = { email: 'cbotnav@gmail.com', email_verified: true };
const EN_UNA_HORA = () => Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
const HACE_UNA_HORA = () => Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

// El contexto de pruebas devuelve una instancia "compat"; las funciones modulares la aceptan.
const db = (ctx: { firestore: () => unknown }) => ctx.firestore() as Firestore;

const tutor = () => db(env.authenticatedContext('tutor', TUTOR));
const tutorSinVerificar = () =>
  db(env.authenticatedContext('tutor2', { email: TUTOR.email, email_verified: false }));
const otroEmail = () => db(env.authenticatedContext('otro', { email: 'otro@gmail.com', email_verified: true }));
const tablet = (uid = 'tablet1') => db(env.authenticatedContext(uid));
const anonimo = () => db(env.unauthenticatedContext());

const intentoNivel = (contexto = 'casa') => ({
  nivelId: 'm1-n1',
  mundo: 1,
  nivel: 0,
  mecanica: 'intrusa',
  estrellas: 3,
  puntuacion: 1,
  duracionMs: 30000,
  contexto,
  completadoEn: Timestamp.now(),
});

const intentoItem = (contexto = 'casa') => ({
  levelAttemptId: 'la1',
  mecanica: 'intrusa',
  item: 'pato',
  unidadObjetivo: 'l',
  patron: 'CV',
  respuesta: 'l',
  correcto: true,
  errorTipo: null,
  latenciaMs: 1200,
  ayudas: 0,
  intentoN: 1,
  contexto,
  creadoEn: Timestamp.now(),
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-viaje-lector',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  // Datos de partida: una alumna, un código vigente, uno caducado y la tablet1 vinculada en casa.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = db(ctx);
    await setDoc(doc(d, 'contenido/mundo-1'), { mundo: 1 });
    await setDoc(doc(d, 'students/ana'), { nombre: 'Ana' });
    await setDoc(doc(d, 'students/otra'), { nombre: 'Otra' });
    await setDoc(doc(d, 'pairingCodes/123456'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'casa', expira: EN_UNA_HORA(),
    });
    await setDoc(doc(d, 'pairingCodes/999999'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'casa', expira: HACE_UNA_HORA(),
    });
    await setDoc(doc(d, 'devices/tablet1'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'casa', codigo: '123456', vinculado: Timestamp.now(),
    });
    await setDoc(doc(d, 'students/ana/levelAttempts/previo'), intentoNivel());
    await setDoc(doc(d, 'students/ana/attempts/previo'), intentoItem());
    await setDoc(doc(d, 'planes/ana'), { retoFijo: {}, deberes: null });
    await setDoc(doc(d, 'planes/otra'), { retoFijo: {}, deberes: null });
  });
});

describe('contenido', () => {
  it('✅ una tablet lo lee', () => assertSucceeds(getDoc(doc(tablet(), 'contenido/mundo-1'))));
  it('❌ sin sesión no se lee', () => assertFails(getDoc(doc(anonimo(), 'contenido/mundo-1'))));
  it('❌ una tablet no lo escribe', () =>
    assertFails(setDoc(doc(tablet(), 'contenido/mundo-1'), { mundo: 9 })));
  it('✅ el tutor lo escribe', () => assertSucceeds(setDoc(doc(tutor(), 'contenido/mundo-2'), { mundo: 2 })));
  it('❌ el tutor sin email verificado no escribe', () =>
    assertFails(setDoc(doc(tutorSinVerificar(), 'contenido/mundo-2'), { mundo: 2 })));
  it('❌ otra cuenta con email no escribe', () =>
    assertFails(setDoc(doc(otroEmail(), 'contenido/mundo-2'), { mundo: 2 })));
});

describe('students', () => {
  it('✅ el tutor lee y crea alumnas', async () => {
    await assertSucceeds(getDoc(doc(tutor(), 'students/ana')));
    await assertSucceeds(setDoc(doc(tutor(), 'students/nueva'), { nombre: 'Lía' }));
  });
  it('❌ la tablet vinculada no lee la ficha de la alumna', () =>
    assertFails(getDoc(doc(tablet(), 'students/ana'))));
  it('❌ la tablet no crea alumnas', () => assertFails(setDoc(doc(tablet(), 'students/x'), { nombre: 'X' })));
});

describe('pairingCodes', () => {
  it('✅ con sesión se lee un código concreto', () =>
    assertSucceeds(getDoc(doc(tablet('nueva'), 'pairingCodes/123456'))));
  it('❌ una tablet no puede listar los códigos', () =>
    assertFails(getDocs(collection(tablet('nueva'), 'pairingCodes'))));
  it('❌ una tablet no crea códigos', () =>
    assertFails(setDoc(doc(tablet(), 'pairingCodes/111111'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'casa', expira: EN_UNA_HORA(),
    })));
  it('✅ el tutor crea y borra códigos', async () => {
    await assertSucceeds(setDoc(doc(tutor(), 'pairingCodes/222222'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'tutoria', expira: EN_UNA_HORA(),
    }));
    await assertSucceeds(deleteDoc(doc(tutor(), 'pairingCodes/222222')));
  });
});

describe('devices (vinculación)', () => {
  const vinculo = (codigo = '123456', cambios: Record<string, unknown> = {}) => ({
    studentId: 'ana', nombre: 'Ana', contexto: 'casa', codigo, vinculado: serverTimestamp(), ...cambios,
  });

  it('✅ una tablet nueva se vincula con un código vigente', () =>
    assertSucceeds(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo())));
  it('❌ con un código caducado', () =>
    assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('999999'))));
  it('❌ con un código inexistente', () =>
    assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('000000'))));
  it('❌ cambiando la alumna del código', () =>
    assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('123456', { studentId: 'otra' }))));
  it('❌ cambiando el contexto del código', () =>
    assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('123456', { contexto: 'tutoria' }))));
  it('❌ escribiendo el documento de OTRA tablet', () =>
    assertFails(setDoc(doc(tablet('nueva'), 'devices/tablet1'), vinculo())));
  it('✅ una tablet lee su propio vínculo', () => assertSucceeds(getDoc(doc(tablet(), 'devices/tablet1'))));
  it('❌ una tablet no lee el de otra', () => assertFails(getDoc(doc(tablet('nueva'), 'devices/tablet1'))));
  it('✅ el tutor lista las tablets y desvincula', async () => {
    await assertSucceeds(getDocs(collection(tutor(), 'devices')));
    await assertSucceeds(deleteDoc(doc(tutor(), 'devices/tablet1')));
  });
});

describe('levelAttempts', () => {
  const ruta = 'students/ana/levelAttempts/nuevo';

  it('✅ la tablet de la alumna guarda un nivel', () =>
    assertSucceeds(setDoc(doc(tablet(), ruta), intentoNivel())));
  it('✅ con PCPM y pegatina opcionales', () =>
    assertSucceeds(setDoc(doc(tablet(), ruta), { ...intentoNivel(), pcpm: 22.5, pegatina: 'sol', pegatinaImg: 1 })));
  it('❌ con un contexto distinto al de la tablet', () =>
    assertFails(setDoc(doc(tablet(), ruta), intentoNivel('tutoria'))));
  it('❌ con más de 3 estrellas', () =>
    assertFails(setDoc(doc(tablet(), ruta), { ...intentoNivel(), estrellas: 4 })));
  it('❌ con campos de más', () =>
    assertFails(setDoc(doc(tablet(), ruta), { ...intentoNivel(), trampa: true })));
  it('❌ para otra alumna', () =>
    assertFails(setDoc(doc(tablet(), 'students/otra/levelAttempts/x'), intentoNivel())));
  it('❌ desde una tablet sin vincular', () =>
    assertFails(setDoc(doc(tablet('nueva'), ruta), intentoNivel())));
  it('✅ la tablet lee los resultados de su alumna', () =>
    assertSucceeds(getDocs(collection(tablet(), 'students/ana/levelAttempts'))));
  it('❌ la tablet no lee los de otra alumna', () =>
    assertFails(getDocs(collection(tablet(), 'students/otra/levelAttempts'))));
  it('❌ nadie edita un resultado (ni el tutor)', async () => {
    await assertFails(updateDoc(doc(tablet(), 'students/ana/levelAttempts/previo'), { estrellas: 0 }));
    await assertFails(updateDoc(doc(tutor(), 'students/ana/levelAttempts/previo'), { estrellas: 0 }));
  });
  it('❌ nadie borra un resultado (ni el tutor)', async () => {
    await assertFails(deleteDoc(doc(tablet(), 'students/ana/levelAttempts/previo')));
    await assertFails(deleteDoc(doc(tutor(), 'students/ana/levelAttempts/previo')));
  });
});

describe('attempts (solo se añaden)', () => {
  const ruta = 'students/ana/attempts/uuid-1';

  it('✅ la tablet de la alumna añade un intento', () =>
    assertSucceeds(setDoc(doc(tablet(), ruta), intentoItem())));
  it('❌ para otra alumna', () =>
    assertFails(setDoc(doc(tablet(), 'students/otra/attempts/uuid-1'), intentoItem())));
  it('❌ con campos de más', () =>
    assertFails(setDoc(doc(tablet(), ruta), { ...intentoItem(), extra: 1 })));
  it('❌ con "correcto" que no sea booleano', () =>
    assertFails(setDoc(doc(tablet(), ruta), { ...intentoItem(), correcto: 'sí' })));
  it('❌ la tablet no lee los intentos', () =>
    assertFails(getDocs(collection(tablet(), 'students/ana/attempts'))));
  it('✅ el tutor lee los intentos', () =>
    assertSucceeds(getDocs(collection(tutor(), 'students/ana/attempts'))));
  it('❌ nadie edita ni borra intentos (ni el tutor)', async () => {
    await assertFails(updateDoc(doc(tablet(), 'students/ana/attempts/previo'), { correcto: false }));
    await assertFails(updateDoc(doc(tutor(), 'students/ana/attempts/previo'), { correcto: false }));
    await assertFails(deleteDoc(doc(tutor(), 'students/ana/attempts/previo')));
  });
});

describe('planes (reto fijado y deberes)', () => {
  it('✅ la tablet de la alumna lee su plan', () => assertSucceeds(getDoc(doc(tablet(), 'planes/ana'))));
  it('❌ la tablet no lee el plan de otra alumna', () => assertFails(getDoc(doc(tablet(), 'planes/otra'))));
  it('❌ una tablet sin vincular no lo lee', () => assertFails(getDoc(doc(tablet('nueva'), 'planes/ana'))));
  it('❌ la tablet no puede cambiarse los deberes', () =>
    assertFails(setDoc(doc(tablet(), 'planes/ana'), { retoFijo: {}, deberes: null })));
  it('✅ el tutor escribe el plan', () =>
    assertSucceeds(setDoc(doc(tutor(), 'planes/ana'), { retoFijo: { burbujas: 2 }, deberes: null })));
});
