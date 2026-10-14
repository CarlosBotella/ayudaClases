/**
 * Tutores (solo administrador): dar de alta por email, desactivar y borrar.
 * El tutor luego entra al panel, pulsa "Crear cuenta" con ese email y lo verifica.
 */
import { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { EMAIL_ADMIN, TutorZ, type Tutor } from '../datos/esquemas.ts';
import { normalizarEmail } from '../sesion/SesionTutor.tsx';
import { estilos } from './AdminMarco.tsx';

export async function cargarTutores(): Promise<Array<{ email: string } & Tutor>> {
  const snap = await getDocs(collection(dbTutor(), 'tutores'));
  const filas: Array<{ email: string } & Tutor> = [];
  snap.forEach((d) => {
    const r = TutorZ.safeParse(d.data());
    if (r.success) filas.push({ email: d.id, ...r.data });
  });
  return filas.sort((a, b) => a.email.localeCompare(b.email));
}

export default function AdminTutores() {
  const [tutores, setTutores] = useState<Array<{ email: string } & Tutor>>([]);
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);

  const recargar = useCallback(() => {
    void cargarTutores().then(setTutores).catch(() => setMensaje('No se pudo leer la lista. ¿Están publicadas las reglas nuevas?'));
  }, []);
  useEffect(recargar, [recargar]);

  const anadir = async () => {
    const e = normalizarEmail(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return setMensaje('Ese email no parece válido.');
    if (e === EMAIL_ADMIN) return setMensaje('Ese es el email del administrador: ya tiene acceso a todo.');
    try {
      await setDoc(doc(dbTutor(), 'tutores', e), { nombre: nombre.trim() || e, activo: true, creado: serverTimestamp() });
      setEmail('');
      setNombre('');
      setMensaje(`✅ ${e} dado de alta. Dile que entre al panel y pulse «Crear cuenta» con ese email.`);
      recargar();
    } catch {
      setMensaje('No se pudo dar de alta.');
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <section className={estilos.tarjeta}>
        <h2 className="mb-1 text-xl font-bold">Dar de alta a un tutor</h2>
        <p className="mb-4 text-sm text-tinta/70">
          Cada tutor solo verá a sus alumnos: los que cree él y los que tú le asignes en «Alumnos y tablets». Los mundos los
          generas tú y son comunes para todos.
        </p>
        <div className="flex flex-wrap gap-3">
          <input className={`${estilos.campo} flex-1`} placeholder="email del tutor" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={`${estilos.campo} flex-1`} placeholder="nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <button type="button" className={estilos.boton} disabled={!email.trim()} onClick={() => void anadir()}>
            Dar de alta
          </button>
        </div>
        {mensaje && <p className="mt-3 font-bold">{mensaje}</p>}
      </section>

      <section className={estilos.tarjeta}>
        <h2 className="mb-3 text-xl font-bold">Tutores ({tutores.length})</h2>
        {tutores.length === 0 ? (
          <p className="text-tinta/60">Todavía no hay tutores. Mientras tanto, solo tú tienes acceso.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tutores.map((t) => (
              <li key={t.email} className="flex flex-wrap items-center gap-3 rounded-xl bg-crema px-4 py-2">
                <span className="flex-1">
                  <strong>{t.nombre}</strong> <span className="text-tinta/60">· {t.email}</span>
                  {!t.activo && <span className="ml-2 rounded bg-arena px-2 text-sm">desactivado</span>}
                </span>
                <button
                  type="button"
                  className={estilos.botonSuave}
                  onClick={() => void updateDoc(doc(dbTutor(), 'tutores', t.email), { activo: !t.activo }).then(recargar)}
                >
                  {t.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className="min-h-11 px-2 text-sm font-bold text-[#c0662b] underline"
                  onClick={() => {
                    if (window.confirm(`¿Quitar a ${t.email}? Dejará de entrar al panel. Sus alumnos seguirán existiendo.`)) {
                      void deleteDoc(doc(dbTutor(), 'tutores', t.email)).then(recargar);
                    }
                  }}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-tinta/60">
          Desactivar corta el acceso al momento (lo comprueban las reglas de seguridad) sin borrar nada.
        </p>
      </section>
    </div>
  );
}
