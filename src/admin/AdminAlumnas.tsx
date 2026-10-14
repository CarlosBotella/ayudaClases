/**
 * Gestión: alumnas, códigos de vinculación (6 dígitos, caducan en 30 min)
 * y tablets vinculadas.
 */
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { AlumnaZ, DispositivoZ, type Contexto, type Dispositivo } from '../datos/esquemas.ts';
import { estilos } from './AdminMarco.tsx';

const MINUTOS_CODIGO = 30;

interface AlumnaFila {
  id: string;
  nombre: string;
}

function generarCodigo(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 1e6);
  return String(n % 1_000_000).padStart(6, '0');
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

export default function AdminAlumnas() {
  const [alumnas, setAlumnas] = useState<AlumnaFila[]>([]);
  const [tablets, setTablets] = useState<Array<{ uid: string } & Dispositivo>>([]);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState<{ codigo: string; expira: number; contexto: Contexto; nombre: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = dbTutor();
    const cancelarA = onSnapshot(query(collection(db, 'students'), orderBy('creado')), (snap) => {
      const filas: AlumnaFila[] = [];
      snap.forEach((d) => {
        const r = AlumnaZ.safeParse(d.data());
        if (r.success) filas.push({ id: d.id, nombre: r.data.nombre });
      });
      setAlumnas(filas);
    });
    const cancelarT = onSnapshot(collection(db, 'devices'), (snap) => {
      const filas: Array<{ uid: string } & Dispositivo> = [];
      snap.forEach((d) => {
        const r = DispositivoZ.safeParse(d.data());
        if (r.success) filas.push({ uid: d.id, ...r.data });
      });
      setTablets(filas);
    });
    // Limpieza: borrar códigos caducados.
    void getDocs(query(collection(db, 'pairingCodes'), where('expira', '<', Timestamp.now()))).then((snap) =>
      snap.forEach((d) => void deleteDoc(d.ref)),
    );
    return () => {
      cancelarA();
      cancelarT();
    };
  }, []);

  const crearAlumna = async () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    try {
      await addDoc(collection(dbTutor(), 'students'), { nombre: limpio, creado: serverTimestamp() });
      setNombre('');
      setError(null);
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
      });
      setCodigo({ codigo: valor, expira, contexto, nombre: alumna.nombre });
    } catch {
      setError('No se pudo generar el código.');
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <section className={estilos.tarjeta}>
        <h2 className="mb-3 text-xl font-bold">Nueva alumna</h2>
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
          </section>
        );
      })}

      {codigo && <CodigoGrande {...codigo} onCerrar={() => setCodigo(null)} />}
    </div>
  );
}
