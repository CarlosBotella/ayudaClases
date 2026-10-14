/**
 * Tests de firestore.rules contra el emulador de Firestore.
 * Cada `it` es un caso de la tabla "permitido / denegado".
 *
 * Personajes:
 *  - admin:     cbotnav@gmail.com (administrador)
 *  - tutorA:    a@cole.es, tutor activo, lleva a "ana"
 *  - tutorB:    b@cole.es, tutor activo, lleva a "otra" (NO a ana)
 *  - inactivo:  c@cole.es, dado de alta pero desactivado
 *  - extrano:   x@gmail.com, con cuenta pero no dado de alta
 *  - tablet1:   tablet vinculada a ana, en casa
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
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const A = 'a@cole.es';
const B = 'b@cole.es';
const EN_UNA_HORA = () => Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
const HACE_UNA_HORA = () => Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

// El contexto de pruebas devuelve una instancia "compat"; las funciones modulares la aceptan.
const db = (ctx: { firestore: () => unknown }) => ctx.firestore() as Firestore;
const adulto = (uid: string, correo: string, verificado = true) =>
  db(env.authenticatedContext(uid, { email: correo, email_verified: verificado }));

const admin = () => adulto('admin', 'cbotnav@gmail.com');
const adminSinVerificar = () => adulto('admin2', 'cbotnav@gmail.com', false);
const tutorA = () => adulto('ta', A);
const tutorASinVerificar = () => adulto('ta2', A, false);
const tutorB = () => adulto('tb', B);
const inactivo = () => adulto('tc', 'c@cole.es');
const extrano = () => adulto('tx', 'x@gmail.com');
const tablet = (uid = 'tablet1') => db(env.authenticatedContext(uid));
const anonimo = () => db(env.unauthenticatedContext());

const intentoNivel = (contexto = 'casa') => ({
  nivelId: 'm1-n1', mundo: 1, nivel: 0, mecanica: 'intrusa', estrellas: 3, puntuacion: 1,
  duracionMs: 30000, contexto, completadoEn: Timestamp.now(),
});

const intentoItem = (contexto = 'casa') => ({
  levelAttemptId: 'la1', mecanica: 'intrusa', item: 'pato', unidadObjetivo: 'l', patron: 'CV',
  respuesta: 'l', correcto: true, errorTipo: null, latenciaMs: 1200, ayudas: 0, intentoN: 1,
  contexto, creadoEn: Timestamp.now(),
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
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = db(ctx);
    await setDoc(doc(d, 'tutores', A), { nombre: 'Ana Tutora', activo: true });
    await setDoc(doc(d, 'tutores', B), { nombre: 'Bea Tutora', activo: true });
    await setDoc(doc(d, 'tutores', 'c@cole.es'), { nombre: 'Carlos', activo: false });
    await setDoc(doc(d, 'contenido/mundo-1'), { mundo: 1 });
    await setDoc(doc(d, 'students/ana'), { nombre: 'Ana', tutores: [A] });
    await setDoc(doc(d, 'students/otra'), { nombre: 'Otra', tutores: [B] });
    await setDoc(doc(d, 'students/antigua'), { nombre: 'Antigua' }); // creada antes de haber varios tutores
    await setDoc(doc(d, 'pairingCodes/123456'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'casa', expira: EN_UNA_HORA(), tutores: [A],
    });
    await setDoc(doc(d, 'pairingCodes/999999'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'casa', expira: HACE_UNA_HORA(), tutores: [A],
    });
    await setDoc(doc(d, 'devices/tablet1'), {
      studentId: 'ana', nombre: 'Ana', contexto: 'casa', codigo: '123456', vinculado: Timestamp.now(), tutores: [A],
    });
    await setDoc(doc(d, 'students/ana/levelAttempts/previo'), intentoNivel());
    await setDoc(doc(d, 'students/ana/attempts/previo'), intentoItem());
    await setDoc(doc(d, 'planes/ana'), { retoFijo: {}, deberes: null });
    await setDoc(doc(d, 'planes/otra'), { retoFijo: {}, deberes: null });
  });
});

describe('tutores (alta y baja)', () => {
  it('✅ el administrador da de alta tutores', () =>
    assertSucceeds(setDoc(doc(admin(), 'tutores/nuevo@cole.es'), { nombre: 'Nuevo', activo: true })));
  it('✅ el administrador los lista', () => assertSucceeds(getDocs(collection(admin(), 'tutores'))));
  it('❌ un tutor no da de alta a otros', () =>
    assertFails(setDoc(doc(tutorA(), 'tutores/amigo@cole.es'), { nombre: 'Amigo', activo: true })));
  it('❌ nadie se da de alta a sí mismo', () =>
    assertFails(setDoc(doc(extrano(), 'tutores/x@gmail.com'), { nombre: 'Yo', activo: true })));
  it('✅ un tutor lee su propia ficha', () => assertSucceeds(getDoc(doc(tutorA(), `tutores/${A}`))));
  it('❌ un tutor no lee la ficha de otro ni la lista', async () => {
    await assertFails(getDoc(doc(tutorA(), `tutores/${B}`)));
    await assertFails(getDocs(collection(tutorA(), 'tutores')));
  });
  it('❌ el administrador sin email verificado no puede', () =>
    assertFails(setDoc(doc(adminSinVerificar(), 'tutores/z@cole.es'), { nombre: 'Z', activo: true })));
});

describe('contenido', () => {
  it('✅ una tablet lo lee', () => assertSucceeds(getDoc(doc(tablet(), 'contenido/mundo-1'))));
  it('❌ sin sesión no se lee', () => assertFails(getDoc(doc(anonimo(), 'contenido/mundo-1'))));
  it('✅ el administrador lo escribe', () => assertSucceeds(setDoc(doc(admin(), 'contenido/mundo-2'), { mundo: 2 })));
  it('❌ un tutor no lo escribe (los mundos son comunes)', () =>
    assertFails(setDoc(doc(tutorA(), 'contenido/mundo-2'), { mundo: 2 })));
  it('❌ una tablet no lo escribe', () => assertFails(setDoc(doc(tablet(), 'contenido/mundo-1'), { mundo: 9 })));
});

describe('alumnos', () => {
  it('✅ el administrador ve a todos', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'students')));
    await assertSucceeds(getDoc(doc(admin(), 'students/antigua')));
  });
  it('✅ un tutor ve a SUS alumnos', async () => {
    await assertSucceeds(getDoc(doc(tutorA(), 'students/ana')));
    await assertSucceeds(getDocs(query(collection(tutorA(), 'students'), where('tutores', 'array-contains', A))));
  });
  it('❌ un tutor no ve a los alumnos de otro', async () => {
    await assertFails(getDoc(doc(tutorA(), 'students/otra')));
    await assertFails(getDoc(doc(tutorA(), 'students/antigua')));
    await assertFails(getDocs(collection(tutorA(), 'students')));
  });
  it('❌ tutor desactivado, sin verificar o no dado de alta: nada', async () => {
    await assertFails(getDoc(doc(inactivo(), 'students/ana')));
    await assertFails(getDoc(doc(tutorASinVerificar(), 'students/ana')));
    await assertFails(getDoc(doc(extrano(), 'students/ana')));
  });
  it('✅ un tutor crea un alumno y queda como su tutor', () =>
    assertSucceeds(setDoc(doc(tutorA(), 'students/nueva'), { nombre: 'Lía', tutores: [A] })));
  it('❌ no puede crear un alumno sin incluirse', () =>
    assertFails(setDoc(doc(tutorA(), 'students/nueva'), { nombre: 'Lía', tutores: [B] })));
  it('✅ un tutor renombra a su alumno', () => assertSucceeds(updateDoc(doc(tutorA(), 'students/ana'), { nombre: 'Anita' })));
  it('❌ un tutor no cambia quién lleva al alumno', () =>
    assertFails(updateDoc(doc(tutorA(), 'students/ana'), { tutores: [A, B] })));
  it('✅ el administrador comparte un alumno con otro tutor', () =>
    assertSucceeds(updateDoc(doc(admin(), 'students/ana'), { tutores: [A, B] })));
  it('❌ la tablet no lee la ficha del alumno', () => assertFails(getDoc(doc(tablet(), 'students/ana'))));
});

describe('códigos de vinculación', () => {
  const codigo = (tutores: string[]) => ({ studentId: 'ana', nombre: 'Ana', contexto: 'tutoria', expira: EN_UNA_HORA(), tutores });
  it('✅ con sesión se lee un código concreto', () => assertSucceeds(getDoc(doc(tablet('nueva'), 'pairingCodes/123456'))));
  it('✅ el tutor del alumno crea un código', () => assertSucceeds(setDoc(doc(tutorA(), 'pairingCodes/222222'), codigo([A]))));
  it('❌ con una lista de tutores distinta a la del alumno', () =>
    assertFails(setDoc(doc(tutorA(), 'pairingCodes/222222'), codigo([A, B]))));
  it('❌ un tutor no crea códigos para alumnos ajenos', () =>
    assertFails(setDoc(doc(tutorB(), 'pairingCodes/222222'), codigo([A]))));
  it('❌ una tablet no crea códigos', () => assertFails(setDoc(doc(tablet(), 'pairingCodes/111111'), codigo([A]))));
  it('✅ un tutor lista solo sus códigos; ❌ todos no', async () => {
    await assertSucceeds(getDocs(query(collection(tutorA(), 'pairingCodes'), where('tutores', 'array-contains', A))));
    await assertFails(getDocs(collection(tutorA(), 'pairingCodes')));
  });
  it('✅ el administrador lista y borra cualquiera', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'pairingCodes')));
    await assertSucceeds(deleteDoc(doc(admin(), 'pairingCodes/999999')));
  });
});

describe('tablets (vinculación)', () => {
  const vinculo = (codigo = '123456', cambios: Record<string, unknown> = {}) => ({
    studentId: 'ana', nombre: 'Ana', contexto: 'casa', codigo, vinculado: serverTimestamp(), tutores: [A], ...cambios,
  });
  it('✅ una tablet nueva se vincula con un código vigente', () =>
    assertSucceeds(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo())));
  it('❌ con un código caducado', () => assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('999999'))));
  it('❌ con un código inexistente', () => assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('000000'))));
  it('❌ cambiando el alumno, el contexto o los tutores del código', async () => {
    await assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('123456', { studentId: 'otra' })));
    await assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('123456', { contexto: 'tutoria' })));
    await assertFails(setDoc(doc(tablet('nueva'), 'devices/nueva'), vinculo('123456', { tutores: [A, B] })));
  });
  it('❌ escribiendo el documento de OTRA tablet', () =>
    assertFails(setDoc(doc(tablet('nueva'), 'devices/tablet1'), vinculo())));
  it('✅ una tablet lee su propio vínculo; ❌ el de otra no', async () => {
    await assertSucceeds(getDoc(doc(tablet(), 'devices/tablet1')));
    await assertFails(getDoc(doc(tablet('nueva'), 'devices/tablet1')));
  });
  it('✅ el tutor del alumno ve y desvincula su tablet', async () => {
    await assertSucceeds(getDocs(query(collection(tutorA(), 'devices'), where('tutores', 'array-contains', A))));
    await assertSucceeds(deleteDoc(doc(tutorA(), 'devices/tablet1')));
  });
  it('❌ otro tutor no ve ni desvincula esa tablet', async () => {
    await assertFails(getDoc(doc(tutorB(), 'devices/tablet1')));
    await assertFails(deleteDoc(doc(tutorB(), 'devices/tablet1')));
    await assertFails(getDocs(collection(tutorB(), 'devices')));
  });
});

describe('levelAttempts', () => {
  const ruta = 'students/ana/levelAttempts/nuevo';
  it('✅ la tablet del alumno guarda un nivel', () => assertSucceeds(setDoc(doc(tablet(), ruta), intentoNivel())));
  it('✅ con PCPM, pegatina y escalón opcionales', () =>
    assertSucceeds(setDoc(doc(tablet(), ruta), { ...intentoNivel(), pcpm: 22.5, pegatina: 'sol', pegatinaImg: 1, escalon: 3 })));
  it('❌ con un contexto distinto al de la tablet', () => assertFails(setDoc(doc(tablet(), ruta), intentoNivel('tutoria'))));
  it('❌ con más de 3 estrellas', () => assertFails(setDoc(doc(tablet(), ruta), { ...intentoNivel(), estrellas: 4 })));
  it('❌ con campos de más', () => assertFails(setDoc(doc(tablet(), ruta), { ...intentoNivel(), trampa: true })));
  it('❌ para otro alumno', () => assertFails(setDoc(doc(tablet(), 'students/otra/levelAttempts/x'), intentoNivel())));
  it('❌ desde una tablet sin vincular', () => assertFails(setDoc(doc(tablet('nueva'), ruta), intentoNivel())));
  it('✅ la tablet y el tutor del alumno los leen', async () => {
    await assertSucceeds(getDocs(collection(tablet(), 'students/ana/levelAttempts')));
    await assertSucceeds(getDocs(collection(tutorA(), 'students/ana/levelAttempts')));
  });
  it('❌ otro tutor no los lee', () => assertFails(getDocs(collection(tutorB(), 'students/ana/levelAttempts'))));
  it('❌ la tablet no lee los de otro alumno', () => assertFails(getDocs(collection(tablet(), 'students/otra/levelAttempts'))));
  it('❌ nadie los edita (ni el administrador)', async () => {
    await assertFails(updateDoc(doc(tablet(), 'students/ana/levelAttempts/previo'), { estrellas: 0 }));
    await assertFails(updateDoc(doc(admin(), 'students/ana/levelAttempts/previo'), { estrellas: 0 }));
  });
  it('❌ la tablet y otro tutor no los borran; ✅ su tutor sí', async () => {
    await assertFails(deleteDoc(doc(tablet(), 'students/ana/levelAttempts/previo')));
    await assertFails(deleteDoc(doc(tutorB(), 'students/ana/levelAttempts/previo')));
    await assertSucceeds(deleteDoc(doc(tutorA(), 'students/ana/levelAttempts/previo')));
  });
});

describe('attempts (solo se añaden)', () => {
  const ruta = 'students/ana/attempts/uuid-1';
  it('✅ la tablet del alumno añade un intento', () => assertSucceeds(setDoc(doc(tablet(), ruta), intentoItem())));
  it('❌ para otro alumno, con campos de más o con "correcto" no booleano', async () => {
    await assertFails(setDoc(doc(tablet(), 'students/otra/attempts/uuid-1'), intentoItem()));
    await assertFails(setDoc(doc(tablet(), ruta), { ...intentoItem(), extra: 1 }));
    await assertFails(setDoc(doc(tablet(), ruta), { ...intentoItem(), correcto: 'sí' }));
  });
  it('❌ la tablet no los lee; ✅ su tutor y el administrador sí; ❌ otro tutor no', async () => {
    await assertFails(getDocs(collection(tablet(), 'students/ana/attempts')));
    await assertSucceeds(getDocs(collection(tutorA(), 'students/ana/attempts')));
    await assertSucceeds(getDocs(collection(admin(), 'students/ana/attempts')));
    await assertFails(getDocs(collection(tutorB(), 'students/ana/attempts')));
  });
  it('❌ nadie los edita', async () => {
    await assertFails(updateDoc(doc(tablet(), 'students/ana/attempts/previo'), { correcto: false }));
    await assertFails(updateDoc(doc(tutorA(), 'students/ana/attempts/previo'), { correcto: false }));
  });
  it('✅ solo su tutor los borra', async () => {
    await assertFails(deleteDoc(doc(tablet(), 'students/ana/attempts/previo')));
    await assertFails(deleteDoc(doc(tutorB(), 'students/ana/attempts/previo')));
    await assertSucceeds(deleteDoc(doc(tutorA(), 'students/ana/attempts/previo')));
  });
});

describe('planes (reto fijado, deberes y repasos)', () => {
  it('✅ la tablet del alumno lee su plan; ❌ el de otro no', async () => {
    await assertSucceeds(getDoc(doc(tablet(), 'planes/ana')));
    await assertFails(getDoc(doc(tablet(), 'planes/otra')));
    await assertFails(getDoc(doc(tablet('nueva'), 'planes/ana')));
  });
  it('❌ la tablet no puede cambiarse los deberes', () =>
    assertFails(setDoc(doc(tablet(), 'planes/ana'), { retoFijo: {}, deberes: null })));
  it('✅ su tutor escribe el plan; ❌ otro tutor no', async () => {
    await assertSucceeds(setDoc(doc(tutorA(), 'planes/ana'), { retoFijo: { burbujas: 2 }, deberes: null }));
    await assertFails(setDoc(doc(tutorB(), 'planes/ana'), { retoFijo: { burbujas: 5 }, deberes: null }));
    await assertFails(getDoc(doc(tutorB(), 'planes/ana')));
  });
});

describe('contenido propio de cada alumno', () => {
  const ruta = 'students/ana/contenido/mundo-1';
  it('✅ su tutor genera los mundos del alumno', () => assertSucceeds(setDoc(doc(tutorA(), ruta), { mundo: 1 })));
  it('❌ otro tutor no puede', () => assertFails(setDoc(doc(tutorB(), ruta), { mundo: 1 })));
  it('✅ la tablet del alumno los lee; ❌ la de otro alumno no', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(db(ctx), ruta), { mundo: 1 });
      await setDoc(doc(db(ctx), 'devices/tablet2'), {
        studentId: 'otra', nombre: 'Otra', contexto: 'casa', codigo: '1', vinculado: Timestamp.now(), tutores: [B],
      });
    });
    await assertSucceeds(getDoc(doc(tablet(), ruta)));
    await assertFails(getDoc(doc(tablet('tablet2'), ruta)));
  });
  it('❌ la tablet no puede cambiarlos', () => assertFails(setDoc(doc(tablet(), ruta), { mundo: 9 })));
});

describe('eliminar un alumno', () => {
  it('✅ su tutor borra la ficha; ❌ otro tutor no', async () => {
    await assertFails(deleteDoc(doc(tutorB(), 'students/ana')));
    await assertSucceeds(deleteDoc(doc(tutorA(), 'students/ana')));
  });
});
