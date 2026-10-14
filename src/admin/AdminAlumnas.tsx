/**
 * Gestión: alumnos, códigos de vinculación (6 dígitos, caducan en 30 min),
 * tablets vinculadas y (solo administrador) qué tutores lleva cada alumno.
 * Cada tutor ve solo a sus alumnos y sus tablets.
 */
import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { DispositivoZ, EMAIL_ADMIN, type Contexto, type Dispositivo } from '../datos/esquemas.ts';
import { useAdulto } from '../sesion/SesionTutor.tsx';
import { estilos } from './AdminMarco.tsx';
import { cargarTutores } from './AdminTutores.tsx';
import { eliminarAlumna } from './eliminarAlumna.ts';
import { useAlumnas, type AlumnoFila } from './useAlumnas.ts';

const MINUTOS_CODIGO = 30;

type AlumnaFila = AlumnoFila;

function generarCodigo(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 1e6);
  return String(n % 1_000_000).padStart(6, '0');
}

/** Confirmación de borrado: hay que escribir el nombre de la alumna. */
function ConfirmarEliminar({ alumna, onCerrar }: { alumna: AlumnaFila; onCerrar: () => void }) {
  const adulto = useAdulto();
  const [texto, setTexto] = useState('');
  const [progreso, setProgreso] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const coincide = texto.trim().toLowerCase() === alumna.nombre.trim().toLowerCase();

  const borrar = async () => {
    setBorrando(true);
    try {
      const r = await eliminarAlumna(alumna.id, setProgreso, adulto);
      setProgreso(
        `Eliminada. Se han borrado ${r.respuestas} respuestas, ${r.resultados} resultados y ${r.tablets} tablets vinculadas.`,
      );
      setTerminado(true);
    } catch {
      setProgreso('No se pudo terminar (¿conexión? ¿reglas nuevas publicadas?). Puedes repetirlo: continuará donde se quedó.');
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-[#c0662b]">Eliminar a {alumna.nombre}</h2>
        {!terminado && (
          <>
            <p className="mt-3">
              Se borrarán <strong>para siempre</strong> todas sus partidas, estrellas, pegatinas, métricas, deberes y
              tablets vinculadas. No se puede deshacer.
            </p>
            <label className="mt-4 flex flex-col gap-1">
              <span className="text-sm font-bold text-tinta/70">Para confirmar, escribe su nombre: {alumna.nombre}</span>
              <input className={estilos.campo} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={borrando} />
            </label>
          </>
        )}
        {progreso && <p className="mt-4 font-bold">{progreso}</p>}
        <div className="mt-6 flex gap-3">
          {!terminado && (
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#c0662b] px-5 font-bold text-white disabled:opacity-40"
              disabled={!coincide || borrando}
              onClick={() => void borrar()}
            >
              {borrando ? 'Eliminando…' : 'Eliminar para siempre'}
            </button>
          )}
          <button type="button" className={estilos.botonSuave} onClick={onCerrar} disabled={borrando}>
            {terminado ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CodigoGrande({ codigo, expira, contexto, nombre, onCerrar }: {
  codigo: string;
  expira: number;
  contexto: Contexto;
  nombre: string;
  onCerrar: () => void;
}) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const restante = Math.max(0, expira - ahora);
  const min = Math.floor(restante / 60000);
  const seg = Math.floor((restante % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
        <p className="text-lg">
          Código para la tablet de <strong>{nombre}</strong> ({contexto === 'casa' ? 'casa' : 'tutoría'})
        </p>
        <p className="my-6 font-mono text-7xl font-bold tracking-[0.2em] text-mar">{codigo}</p>
        <p className="text-tinta/70">
          En la tablet: abre la app y teclea el código.{' '}
          {restante > 0 ? `Caduca en ${min}:${String(seg).padStart(2, '0')}.` : 'Ha caducado: genera otro.'}
        </p>
        <button type="button" className={`${estilos.boton} mt-6`} onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

/** Solo administrador: quién lleva a este alumno. */
function TutoresDelAlumno({ alumna, tutores, onCambio }: { alumna: AlumnaFila; tutores: string[]; onCambio: () => void }) {
  const guardar = (lista: string[]) =>
    void updateDoc(doc(dbTutor(), 'students', alumna.id), { tutores: lista }).then(onCambio);
  const disponibles = [EMAIL_ADMIN, ...tutores].filter((t) => !alumna.tutores.includes(t));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-bold text-tinta/70">Lo llevan:</span>
      {alumna.tutores.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-full bg-crema px-3 py-1">
          {t === EMAIL_ADMIN ? 'tú (administrador)' : t}
          {alumna.tutores.length > 1 && (
            <button type="button" aria-label={`Quitar a ${t}`} className="px-1 font-bold text-[#c0662b]" onClick={() => guardar(alumna.tutores.filter((x) => x !== t))}>
              ×
            </button>
          )}
        </span>
      ))}
      {disponibles.length > 0 && (
        <select
          className="min-h-9 rounded-lg border-2 border-arena bg-white px-2"
          value=""
          onChange={(e) => e.target.value && guardar([...alumna.tutores, e.target.value])}
        >
          <option value="">+ asignar tutor…</option>
          {disponibles.map((t) => (
            <option key={t} value={t}>
              {t === EMAIL_ADMIN ? 'tú (administrador)' : t}
            </option>
          ))}
        </select>
      )}
      <span className="text-tinta/50">· Para que una tablet ya vinculada refleje el cambio, vuelve a vincularla.</span>
    </div>
  );
}

export default function AdminAlumnas() {
  const { email, esAdmin } = useAdulto();
  const { alumnas, recargar } = useAlumnas();
  const [tutoresAlta, setTutoresAlta] = useState<string[]>([]);
  const migrado = useRef(false);
  const [tablets, setTablets] = useState<Array<{ uid: string } & Dispositivo>>([]);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState<{ codigo: string; expira: number; contexto: Contexto; nombre: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<AlumnaFila | null>(null);

  useEffect(() => {
    const db = dbTutor();
    // Cada tutor solo puede (y solo debe) ver las tablets de sus alumnos.
    const consulta = esAdmin ? collection(db, 'devices') : query(collection(db, 'devices'), where('tutores', 'array-contains', email));
    const cancelarT = onSnapshot(consulta, (snap) => {
      const filas: Array<{ uid: string } & Dispositivo> = [];
      snap.forEach((d) => {
        const r = DispositivoZ.safeParse(d.data());
        if (r.success) filas.push({ uid: d.id, ...r.data });
      });
      setTablets(filas);
    });
    if (esAdmin) {
      // Limpieza: borrar códigos caducados.
      void getDocs(query(collection(db, 'pairingCodes'), where('expira', '<', Timestamp.now()))).then((snap) =>
        snap.forEach((d) => void deleteDoc(d.ref)),
      );
      void cargarTutores()
        .then((t) => setTutoresAlta(t.filter((x) => x.activo).map((x) => x.email)))
        .catch(() => setTutoresAlta([]));
    }
    return cancelarT;
  }, [email, esAdmin]);

  // Alumnos creados antes de haber varios tutores: pasan a ser del administrador.
  useEffect(() => {
    if (!esAdmin || migrado.current) return;
    const sinTutor = alumnas.filter((a) => a.tutores.length === 0);
    if (sinTutor.length === 0) return;
    migrado.current = true;
    void Promise.all(sinTutor.map((a) => updateDoc(doc(dbTutor(), 'students', a.id), { tutores: [EMAIL_ADMIN] }))).then(recargar);
  }, [alumnas, esAdmin, recargar]);

  const crearAlumna = async () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    try {
      await addDoc(collection(dbTutor(), 'students'), { nombre: limpio, tutores: [email], creado: serverTimestamp() });
      setNombre('');
      setError(null);
      recargar();
    } catch {
      setError('No se pudo crear. ¿Hay conexión? ¿Están publicadas las reglas?');
    }
  };

  const nuevoCodigo = async (alumna: AlumnaFila, contexto: Contexto) => {
    const valor = generarCodigo();
    const expira = Date.now() + MINUTOS_CODIGO * 60 * 1000;
    try {
      await setDoc(doc(dbTutor(), 'pairingCodes', valor), {
        studentId: alumna.id,
        nombre: alumna.nombre,
        contexto,
        expira: Timestamp.fromMillis(expira),
        // Copia exacta de los tutores del alumno (las reglas lo exigen).
        tutores: alumna.tutores,
      });
      setCodigo({ codigo: valor, expira, contexto, nombre: alumna.nombre });
    } catch {
      setError('No se pudo generar el código.');
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <section className={estilos.tarjeta}>
        <h2 className="mb-3 text-xl font-bold">Nuevo alumno</h2>
        <p className="mb-3 text-sm text-tinta/70">Solo el nombre de pila: no se guarda ningún otro dato personal.</p>
        <div className="flex gap-3">
          <input
            className={estilos.campo}
            placeholder="Nombre de pila"
            maxLength={40}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void crearAlumna()}
          />
          <button type="button" className={estilos.boton} onClick={() => void crearAlumna()} disabled={!nombre.trim()}>
            Crear
          </button>
        </div>
        {error && <p className="mt-3 font-bold text-[#c0662b]">{error}</p>}
      </section>

      {alumnas.map((a) => {
        const suyas = tablets.filter((t) => t.studentId === a.id);
        return (
          <section key={a.id} className={estilos.tarjeta}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="flex-1 text-2xl font-bold text-mar">{a.nombre}</h2>
              <button type="button" className={estilos.boton} onClick={() => void nuevoCodigo(a, 'casa')}>
                Código para casa
              </button>
              <button type="button" className={estilos.boton} onClick={() => void nuevoCodigo(a, 'tutoria')}>
                Código para tutoría
              </button>
            </div>
            <h3 className="mb-2 mt-4 font-bold text-tinta/70">Tablets vinculadas</h3>
            {suyas.length === 0 ? (
              <p className="text-tinta/60">Ninguna todavía.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {suyas.map((t) => (
                  <li key={t.uid} className="flex items-center gap-3 rounded-xl bg-crema px-4 py-2">
                    <span className="flex-1">
                      {t.contexto === 'casa' ? '🏠 Casa' : '📚 Tutoría'}
                      {t.vinculado instanceof Timestamp &&
                        ` · desde el ${t.vinculado.toDate().toLocaleDateString('es-ES')}`}
                    </span>
                    <button type="button" className={estilos.botonSuave} onClick={() => void deleteDoc(doc(dbTutor(), 'devices', t.uid))}>
                      Desvincular
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {esAdmin && <TutoresDelAlumno alumna={a} tutores={tutoresAlta} onCambio={recargar} />}
            <div className="mt-4 flex justify-end border-t border-arena pt-3">
              <button type="button" className="min-h-11 px-3 text-sm font-bold text-[#c0662b] underline" onClick={() => setAEliminar(a)}>
                Eliminar alumno
              </button>
            </div>
          </section>
        );
      })}

      {codigo && <CodigoGrande {...codigo} onCerrar={() => setCodigo(null)} />}
      {aEliminar && (
        <ConfirmarEliminar
          alumna={aEliminar}
          onCerrar={() => {
            setAEliminar(null);
            recargar();
          }}
        />
      )}
    </div>
  );
}
