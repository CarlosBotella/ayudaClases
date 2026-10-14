/**
 * Contenido: los mundos (palabras y niveles) de cada alumno.
 *  - Cada tutor elige al alumno y genera/regenera sus mundos, los copia a otros
 *    alumnos suyos o vuelve al contenido común.
 *  - El administrador además gestiona el contenido COMÚN (el de por defecto).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { deleteDoc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { ContenidoZ, type Contenido } from '../datos/esquemas.ts';
import { refContenido } from '../datos/rutasContenido.ts';
import { MUNDOS } from '../lib/clasificador.ts';
import { useAdulto } from '../sesion/SesionTutor.tsx';
import { estilos } from './AdminMarco.tsx';
import { useAlumnas, type AlumnoFila } from './useAlumnas.ts';

type Estado = { propio: Contenido | null; comun: Contenido | null };
const COMUN = 'comun';

async function leer(mundo: number, alumno: string | null): Promise<Contenido | null> {
  const snap = await getDoc(refContenido(dbTutor(), mundo, alumno));
  const r = snap.exists() ? ContenidoZ.safeParse(snap.data()) : null;
  return r?.success ? r.data : null;
}

const resumen = (c: Contenido) => {
  const fecha = c.actualizado instanceof Timestamp ? ` · ${c.actualizado.toDate().toLocaleDateString('es-ES')}` : '';
  return `${Object.keys(c.palabras).length} palabras · ${c.niveles.length} niveles · ${c.frases.length} frases${fecha}`;
};

function Copiar({
  mundo,
  origen,
  alumnas,
  onCerrar,
}: {
  mundo: number;
  origen: AlumnoFila;
  alumnas: AlumnoFila[];
  onCerrar: (copiado: boolean) => void;
}) {
  const otras = alumnas.filter((a) => a.id !== origen.id);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState<string | null>(null);

  const copiar = async () => {
    const datos = await leer(mundo, origen.id);
    if (!datos) return;
    try {
      await Promise.all(
        [...elegidas].map((id) => setDoc(refContenido(dbTutor(), mundo, id), { ...datos, actualizado: serverTimestamp() })),
      );
      onCerrar(true);
    } catch {
      setMensaje('No se pudo copiar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h2 className="text-xl font-bold">
          Copiar el Mundo {mundo} de {origen.nombre} a…
        </h2>
        {otras.length === 0 ? (
          <p className="mt-3 text-tinta/60">No tienes más alumnos.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {otras.map((a) => (
              <li key={a.id}>
                <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-crema">
                  <input
                    type="checkbox"
                    className="size-5 accent-[#008a7c]"
                    checked={elegidas.has(a.id)}
                    onChange={() =>
                      setElegidas((s) => {
                        const n = new Set(s);
                        if (n.has(a.id)) n.delete(a.id);
                        else n.add(a.id);
                        return n;
                      })
                    }
                  />
                  {a.nombre}
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-tinta/60">Si ya tenían ese mundo propio, se sustituye.</p>
        {mensaje && <p className="mt-2 font-bold text-[#c0662b]">{mensaje}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" className={estilos.boton} disabled={elegidas.size === 0} onClick={() => void copiar()}>
            Copiar a {elegidas.size}
          </button>
          <button type="button" className={estilos.botonSuave} onClick={() => onCerrar(false)}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminContenido() {
  const { esAdmin } = useAdulto();
  const { alumnas } = useAlumnas();
  const [params, setParams] = useSearchParams();
  const elegido = params.get('alumno') ?? alumnas[0]?.id ?? (esAdmin ? COMUN : null);
  const esComun = elegido === COMUN;
  const alumno = alumnas.find((a) => a.id === elegido) ?? null;
  const [estados, setEstados] = useState<Record<number, Estado | undefined>>({});
  const [copiando, setCopiando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const recargar = useCallback(() => {
    if (!elegido) return;
    setEstados({});
    for (const m of MUNDOS) {
      void Promise.all([esComun ? Promise.resolve(null) : leer(m.n, elegido), leer(m.n, null)]).then(([propio, comun]) =>
        setEstados((e) => ({ ...e, [m.n]: { propio, comun } })),
      );
    }
  }, [elegido, esComun]);
  useEffect(recargar, [recargar]);

  const volverAlComun = async (mundo: number) => {
    if (!alumno || !window.confirm(`¿Borrar el Mundo ${mundo} propio de ${alumno.nombre} y usar el común?`)) return;
    await deleteDoc(refContenido(dbTutor(), mundo, alumno.id));
    setMensaje(`Mundo ${mundo} de ${alumno.nombre}: vuelve a usar el contenido común.`);
    recargar();
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-bold">
          Contenido de
          <select
            className={`${estilos.campo} w-64`}
            value={elegido ?? ''}
            onChange={(e) => {
              setMensaje(null);
              setParams({ alumno: e.target.value });
            }}
          >
            {alumnas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
            {esAdmin && <option value={COMUN}>— Contenido común (por defecto) —</option>}
          </select>
        </label>
      </div>

      <p className="text-tinta/70">
        {esComun
          ? 'El contenido común es el que usan los alumnos que no tienen un mundo propio. Solo lo puede cambiar el administrador.'
          : 'Elige las palabras de cada mundo para este alumno. Si un mundo no es propio, usa el común. Un mundo se abre en su tablet cuando tiene contenido.'}
      </p>
      {mensaje && <p className="font-bold">{mensaje}</p>}

      {!elegido ? (
        <p className={estilos.tarjeta}>Crea primero un alumno en «Alumnos y tablets».</p>
      ) : (
        MUNDOS.map((m) => {
          const e = estados[m.n];
          const propio = e?.propio ?? null;
          const comun = e?.comun ?? null;
          const enUso = esComun ? comun : (propio ?? comun);
          return (
            <section key={m.n} className={`${estilos.tarjeta} flex flex-wrap items-center gap-4`}>
              <span className="flex size-14 items-center justify-center rounded-full bg-mar text-2xl font-bold text-white">{m.n}</span>
              <div className="min-w-56 flex-1">
                <h2 className="text-xl font-bold">{m.nombre}</h2>
                <p className="text-tinta/70">
                  {e === undefined
                    ? 'Comprobando…'
                    : !enUso
                      ? 'Sin contenido (cerrado en la tablet)'
                      : esComun
                        ? resumen(enUso)
                        : propio
                          ? `Propio · ${resumen(propio)}`
                          : `Usa el común · ${resumen(enUso)}`}
                </p>
              </div>
              <Link to={esComun ? `/admin/generar/${m.n}` : `/admin/generar/${m.n}?alumno=${elegido}`} className={estilos.boton}>
                {esComun ? (comun ? 'Regenerar' : 'Generar') : propio ? 'Cambiar palabras' : 'Elegir palabras'}
              </Link>
              {!esComun && propio && alumno && (
                <>
                  <button type="button" className={estilos.botonSuave} onClick={() => setCopiando(m.n)}>
                    Copiar a…
                  </button>
                  <button type="button" className="min-h-11 px-2 text-sm font-bold text-[#c0662b] underline" onClick={() => void volverAlComun(m.n)}>
                    Volver al común
                  </button>
                </>
              )}
            </section>
          );
        })
      )}

      {copiando !== null && alumno && (
        <Copiar
          mundo={copiando}
          origen={alumno}
          alumnas={alumnas}
          onCerrar={(copiado) => {
            setCopiando(null);
            if (copiado) setMensaje(`Mundo ${copiando} copiado.`);
          }}
        />
      )}
    </div>
  );
}
