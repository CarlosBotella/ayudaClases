/**
 * Deberes para casa ("la mochila"): qué actividades, de qué mundo y cuántos
 * días por semana. Debajo, cómo los ha cumplido las últimas semanas.
 */
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { ContenidoZ, IntentoNivelZ, PlanZ, type Actividad, type Deberes } from '../datos/esquemas.ts';
import { MUNDOS } from '../lib/clasificador.ts';
import { historialDeberes, NOMBRE_ACTIVIDAD, type SemanaDeberes } from '../lib/deberes.ts';
import type { PartidaRegistrada } from '../lib/progreso.ts';
import { estilos } from './AdminMarco.tsx';
import { useAlumnas } from './useAlumnas.ts';

const TODAS = Object.keys(NOMBRE_ACTIVIDAD) as Actividad[];
const POR_DEFECTO: Deberes = { mundo: 1, actividades: ['burbujas', 'tren', 'trazo'], diasPorSemana: 3, activos: true };

const etiqueta = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export default function AdminDeberes() {
  const { alumnas } = useAlumnas();
  const [sid, setSid] = useState<string | null>(null);
  const [deberes, setDeberes] = useState<Deberes>(POR_DEFECTO);
  const [mundosGuardados, setMundosGuardados] = useState<number[]>([]);
  const [historial, setHistorial] = useState<SemanaDeberes[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (!sid && alumnas[0]) setSid(alumnas[0].id);
  }, [alumnas, sid]);

  useEffect(() => {
    void Promise.all(MUNDOS.map((m) => getDoc(doc(dbTutor(), 'contenido', `mundo-${m.n}`)))).then((snaps) =>
      setMundosGuardados(snaps.flatMap((s, i) => (s.exists() && ContenidoZ.safeParse(s.data()).success ? [i + 1] : []))),
    );
  }, []);

  useEffect(() => {
    if (!sid) return;
    setMensaje(null);
    void (async () => {
      const [planSnap, intentosSnap] = await Promise.all([
        getDoc(doc(dbTutor(), 'planes', sid)),
        getDocs(collection(dbTutor(), 'students', sid, 'levelAttempts')),
      ]);
      const plan = planSnap.exists() ? PlanZ.safeParse(planSnap.data()) : null;
      const actuales = plan?.success && plan.data.deberes ? plan.data.deberes : POR_DEFECTO;
      setDeberes(actuales);
      const partidas: PartidaRegistrada[] = [];
      intentosSnap.forEach((d) => {
        const r = IntentoNivelZ.safeParse(d.data());
        if (!r.success) return;
        const fecha = r.data.completadoEn instanceof Timestamp ? r.data.completadoEn.toDate() : new Date(0);
        partidas.push({ ...r.data, fecha });
      });
      setHistorial(historialDeberes(actuales, partidas, new Date(), 4));
    })();
  }, [sid]);

  const alternar = (a: Actividad) =>
    setDeberes((d) => {
      const actividades = d.actividades.includes(a) ? d.actividades.filter((x) => x !== a) : [...d.actividades, a];
      return { ...d, actividades: TODAS.filter((x) => actividades.includes(x)) };
    });

  const guardar = async () => {
    if (!sid || deberes.actividades.length === 0) return;
    try {
      await setDoc(doc(dbTutor(), 'planes', sid), { deberes, actualizado: serverTimestamp() }, { merge: true });
      setMensaje(deberes.activos ? '✅ Deberes guardados: ya aparecen en la tablet de casa.' : '✅ Guardado: deberes desactivados.');
    } catch {
      setMensaje('No se pudo guardar. ¿Hay conexión? ¿Están publicadas las reglas nuevas?');
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <label className="flex items-center gap-2 font-bold">
        Alumna
        <select className={`${estilos.campo} w-56`} value={sid ?? ''} onChange={(e) => setSid(e.target.value)}>
          {alumnas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </label>

      <section className={`${estilos.tarjeta} flex flex-col gap-5`}>
        <h2 className="text-xl font-bold">La mochila de esta semana</h2>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-6 accent-[#008a7c]"
            checked={deberes.activos}
            onChange={(e) => setDeberes((d) => ({ ...d, activos: e.target.checked }))}
          />
          <span className="font-bold">Deberes activos (la mochila aparece en la tablet de casa)</span>
        </label>

        <div>
          <p className="mb-2 font-bold">Mundo</p>
          <div className="flex flex-wrap gap-2">
            {MUNDOS.map((m) => (
              <button
                key={m.n}
                type="button"
                disabled={!mundosGuardados.includes(m.n)}
                onClick={() => setDeberes((d) => ({ ...d, mundo: m.n }))}
                className={deberes.mundo === m.n ? estilos.boton : estilos.botonSuave}
                title={mundosGuardados.includes(m.n) ? m.nombre : 'Mundo sin generar'}
              >
                {m.n}. {m.nombre}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-bold">Actividades de cada día</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TODAS.map((a) => (
              <label key={a} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-crema px-3">
                <input type="checkbox" className="size-5 accent-[#008a7c]" checked={deberes.actividades.includes(a)} onChange={() => alternar(a)} />
                {NOMBRE_ACTIVIDAD[a]}
                {a === 'cuaderno' && <span className="text-sm text-tinta/60">(necesita cuaderno y lápiz)</span>}
                {a === 'carrera' && <span className="text-sm text-tinta/60">(necesita un adulto)</span>}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-tinta/60">
            Unos 3–4 minutos por actividad. Tres actividades ≈ una sesión de 10 minutos.
          </p>
        </div>

        <label className="flex items-center gap-3 font-bold">
          Días por semana
          <input
            type="range"
            min={1}
            max={7}
            value={deberes.diasPorSemana}
            onChange={(e) => setDeberes((d) => ({ ...d, diasPorSemana: Number(e.target.value) }))}
            className="w-56 accent-[#008a7c]"
          />
          <span className="text-2xl text-mar">{deberes.diasPorSemana}</span>
        </label>

        <div className="flex items-center gap-3">
          <button type="button" className={estilos.boton} disabled={deberes.actividades.length === 0} onClick={() => void guardar()}>
            Guardar deberes
          </button>
          {mensaje && <span className="font-bold">{mensaje}</span>}
        </div>
      </section>

      <section className={estilos.tarjeta}>
        <h2 className="mb-3 text-xl font-bold">Cómo los está haciendo</h2>
        <p className="mb-3 text-sm text-tinta/60">
          Un día cuenta como hecho si ha completado todas las actividades en la tablet de casa.
        </p>
        <div className="flex flex-col gap-3">
          {historial.map((s, i) => (
            <div key={s.semana} className="flex flex-wrap items-center gap-3">
              <span className="w-40 font-bold">{i === 0 ? 'Esta semana' : `Semana del ${etiqueta(s.semana)}`}</span>
              <div className="flex gap-1.5">
                {s.dias.map((d) => (
                  <span
                    key={d.clave}
                    title={d.completo ? 'hecho' : d.parcial ? 'a medias' : 'sin hacer'}
                    className={`flex size-9 items-center justify-center rounded-lg text-sm font-bold ${
                      d.completo ? 'bg-[#008a7c] text-white' : d.parcial ? 'bg-[#b5e0d9] text-tinta' : 'bg-crema text-tinta/40'
                    } ${d.esHoy ? 'ring-2 ring-tinta' : ''}`}
                  >
                    {d.letra}
                  </span>
                ))}
              </div>
              <span className={`font-bold ${s.cumplida ? 'text-[#008a7c]' : 'text-tinta/70'}`}>
                {s.completos} de {s.objetivo} días {s.cumplida ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap gap-4 text-sm text-tinta/70">
          <span><span className="mr-1 inline-block size-3 rounded bg-[#008a7c]" /> hecho</span>
          <span><span className="mr-1 inline-block size-3 rounded bg-[#b5e0d9]" /> a medias</span>
          <span><span className="mr-1 inline-block size-3 rounded bg-crema outline outline-1 outline-tinta/20" /> sin hacer</span>
        </p>
      </section>
    </div>
  );
}
