/**
 * Estado del contenido de cada mundo y acceso al generador.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { ContenidoZ, type Contenido } from '../datos/esquemas.ts';
import { MUNDOS } from '../lib/clasificador.ts';
import { estilos } from './AdminMarco.tsx';

export default function AdminContenido() {
  const [mundos, setMundos] = useState<Record<number, Contenido | null>>({});

  useEffect(() => {
    for (const m of MUNDOS) {
      void getDoc(doc(dbTutor(), 'contenido', `mundo-${m.n}`)).then((snap) => {
        const r = snap.exists() ? ContenidoZ.safeParse(snap.data()) : null;
        setMundos((prev) => ({ ...prev, [m.n]: r?.success ? r.data : null }));
      });
    }
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <p className="text-tinta/70">
        Cada mundo se abre en las tablets cuando lo generas y lo guardas. Puedes volver a generarlo cuando quieras; se
        conservan las palabras que ya habías aprobado.
      </p>
      {MUNDOS.map((m) => {
        const c = mundos[m.n];
        const fecha = c?.actualizado instanceof Timestamp ? c.actualizado.toDate().toLocaleString('es-ES') : null;
        return (
          <section key={m.n} className={`${estilos.tarjeta} flex flex-wrap items-center gap-4`}>
            <span className="flex size-14 items-center justify-center rounded-full bg-mar text-2xl font-bold text-white">{m.n}</span>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{m.nombre}</h2>
              <p className="text-tinta/70">
                {c === undefined
                  ? 'Comprobando…'
                  : c === null
                    ? 'Sin generar (cerrado en las tablets)'
                    : `${Object.keys(c.palabras).length} palabras · ${c.niveles.length} niveles · ${c.frases.length} frases${fecha ? ` · ${fecha}` : ''}`}
              </p>
            </div>
            <Link to={`/admin/generar/${m.n}`} className={estilos.boton}>
              {c ? 'Regenerar' : 'Generar'} mundo {m.n}
            </Link>
          </section>
        );
      })}
    </div>
  );
}
