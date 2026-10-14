/**
 * Panel de métricas (Fase 5). Todo se calcula aquí, en el navegador, a partir
 * de las respuestas y resultados de la alumna elegida.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, deleteField, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dbTutor } from '../firebase.ts';
import { IntentoItemZ, IntentoNivelZ, PlanZ, type Contenido, type Mecanica } from '../datos/esquemas.ts';
import { calcularRetos, ESCALON_INICIAL, JUEGOS_SIN_ADAPTAR } from '../lib/adaptativo.ts';
import { NOMBRE_JUEGO } from './useAlumnas.ts';
import { crearAleatorio } from '../lib/aleatorio.ts';
import {
  aReforzar,
  comparativaContextos,
  distribucionErrores,
  estadoUnidades,
  evolucionSemanal,
  mapaDeCalor,
  type CeldaCalor,
  type Respuesta,
  type ResultadoNivel,
  type TipoUnidad,
} from '../lib/metricas.ts';
import { crearNivelRepaso } from '../generador/repaso.ts';
import { contenidosDelAlumno } from './contenidoAlumno.ts';
import { useAlumnas } from './useAlumnas.ts';
import { estilos } from './AdminMarco.tsx';

// Colores validados (contraste y daltonismo) para las dos series: casa / tutoría.
const COLOR_CASA = '#c76b00';
const COLOR_TUTORIA = '#008a7c';
// Rampa secuencial de un solo tono (verde azulado) para el % de acierto.
const RAMPA = ['#e3f3f1', '#b5e0d9', '#78c5b9', '#38a596', '#00786c'];
const TINTA_SOBRE = ['#2d3436', '#2d3436', '#2d3436', '#ffffff', '#ffffff'];

const aFecha = (t: unknown): Date => (t instanceof Timestamp ? t.toDate() : new Date(0));
const etiquetaSemana = (s: string) =>
  new Date(`${s}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const segundos = (ms: number) => `${(ms / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s`;

function escalon(porcentaje: number): number {
  if (porcentaje >= 95) return 4;
  if (porcentaje >= 85) return 3;
  if (porcentaje >= 70) return 2;
  if (porcentaje >= 50) return 1;
  return 0;
}

interface Datos {
  respuestas: Respuesta[];
  resultados: ResultadoNivel[];
  contenidos: Contenido[];
  retoFijo: Record<string, number>;
}

const JUEGOS_ADAPTABLES = (Object.keys(NOMBRE_JUEGO) as Mecanica[]).filter((j) => !JUEGOS_SIN_ADAPTAR.includes(j));

async function cargar(sid: string): Promise<Datos> {
  const db = dbTutor();
  const [snapP, snapR, snapN, contenidos] = await Promise.all([
    getDoc(doc(db, 'planes', sid)),
    getDocs(query(collection(db, 'students', sid, 'attempts'), orderBy('creadoEn'))),
    getDocs(query(collection(db, 'students', sid, 'levelAttempts'), orderBy('completadoEn'))),
    contenidosDelAlumno(sid),
  ]);
  const respuestas: Respuesta[] = [];
  snapR.forEach((d) => {
    const r = IntentoItemZ.safeParse(d.data());
    if (r.success) respuestas.push({ ...r.data, fecha: aFecha(r.data.creadoEn) });
  });
  const resultados: ResultadoNivel[] = [];
  snapN.forEach((d) => {
    const r = IntentoNivelZ.safeParse(d.data());
    if (r.success) resultados.push({ ...r.data, fecha: aFecha(r.data.completadoEn) });
  });
  const plan = snapP.exists() ? PlanZ.safeParse(snapP.data()) : null;
  return { respuestas, resultados, contenidos, retoFijo: plan?.success ? plan.data.retoFijo : {} };
}

// ─── Piezas ─────────────────────────────────────────────────────────────────

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className={estilos.tarjeta}>
      <p className="text-sm font-bold text-tinta/60">{titulo}</p>
      <p className="mt-1 text-4xl font-bold text-tinta">{valor}</p>
      {nota && <p className="mt-1 text-sm text-tinta/60">{nota}</p>}
    </div>
  );
}

function MapaCalor({ celdas }: { celdas: CeldaCalor[] }) {
  if (celdas.length === 0) return <p className="text-tinta/60">Todavía no hay datos.</p>;
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
        {celdas.map((c) => {
          const e = escalon(c.porcentaje);
          const pocos = c.intentos < 3;
          return (
            <div
              key={c.unidad}
              title={`${c.unidad}: ${c.aciertos} de ${c.intentos} bien (${c.porcentaje} %) · tiempo mediano ${segundos(c.latenciaMedianaMs)}`}
              className={`flex flex-col items-center rounded-xl px-2 py-2 ${pocos ? 'opacity-50 outline-2 outline-dashed outline-tinta/30' : ''}`}
              style={{ background: RAMPA[e], color: TINTA_SOBRE[e] }}
            >
              <span className="font-lectura text-2xl font-bold">{c.unidad}</span>
              <span className="text-lg font-bold">{c.porcentaje} %</span>
              <span className="text-xs">
                {segundos(c.latenciaMedianaMs)} · {c.intentos}×
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-tinta/70">
        <span>% de acierto:</span>
        {['< 50', '50–69', '70–84', '85–94', '≥ 95'].map((t, i) => (
          <span key={t} className="rounded px-2 py-0.5" style={{ background: RAMPA[i], color: TINTA_SOBRE[i] }}>
            {t}
          </span>
        ))}
        <span className="ml-2">· Las celdas punteadas tienen menos de 3 intentos.</span>
      </div>
    </>
  );
}

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function AdminMetricas() {
  const { alumnas } = useAlumnas();
  const [sid, setSid] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoUnidad>('silaba');
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [mensajeRepaso, setMensajeRepaso] = useState<string | null>(null);

  useEffect(() => {
    if (!sid && alumnas[0]) setSid(alumnas[0].id);
  }, [alumnas, sid]);

  const recargar = useCallback(() => {
    if (!sid) return;
    setCargando(true);
    setError(null);
    cargar(sid)
      .then(setDatos)
      .catch(() => setError('No se pudieron leer los datos. ¿Hay conexión?'))
      .finally(() => setCargando(false));
  }, [sid]);

  useEffect(recargar, [recargar]);

  const m = useMemo(() => {
    if (!datos) return null;
    const estados = estadoUnidades(datos.respuestas, tipo);
    const semanas = evolucionSemanal(datos.resultados).map((s) => ({ ...s, etiqueta: etiquetaSemana(s.semana) }));
    const pcpms = datos.resultados.filter((r) => r.pcpm !== undefined).map((r) => r.pcpm as number);
    const retos = calcularRetos(
      datos.resultados.map((r) => ({ mecanica: r.mecanica, puntuacion: r.puntuacion ?? 0, fecha: r.fecha })),
      datos.retoFijo,
    );
    return {
      retos,
      calor: mapaDeCalor(datos.respuestas, tipo),
      dominadas: estados.filter((e) => e.dominada).map((e) => e.unidad).sort((a, b) => a.localeCompare(b, 'es')),
      reforzar: aReforzar(estados),
      errores: distribucionErrores(datos.respuestas),
      semanas,
      contextos: comparativaContextos(datos.respuestas, datos.resultados),
      acierto: datos.respuestas.length
        ? Math.round((datos.respuestas.filter((r) => r.correcto).length / datos.respuestas.length) * 100)
        : 0,
      mejorPcpm: pcpms.length ? Math.max(...pcpms) : null,
      ultimoPcpm: pcpms.length ? pcpms[pcpms.length - 1] : null,
    };
  }, [datos, tipo]);

  // Por defecto, se proponen las 5 peores para el repaso.
  useEffect(() => {
    setElegidas(new Set((m?.reforzar ?? []).slice(0, 5).map((e) => e.unidad)));
    setMensajeRepaso(null);
  }, [m?.reforzar]);

  const crearRepaso = async () => {
    if (!datos) return;
    const orden = (m?.reforzar ?? []).map((e) => e.unidad).filter((u) => elegidas.has(u));
    const plan = crearNivelRepaso(orden, datos.contenidos, crearAleatorio(Date.now()));
    if (!plan || !sid) {
      setMensajeRepaso('No hay palabras en los mundos guardados que contengan esas unidades.');
      return;
    }
    try {
      // El repaso es de ESTE alumno: se guarda en su plan, no en el mundo (que es común).
      await setDoc(
        doc(dbTutor(), 'planes', sid),
        { repasos: { [String(plan.mundo)]: plan.nivel }, actualizado: serverTimestamp() },
        { merge: true },
      );
      setMensajeRepaso(
        `✅ Nivel de repaso creado al final del Mundo ${plan.mundo} (${plan.unidades.join(', ')}). Sustituye al repaso anterior de ese mundo.`,
      );
      recargar();
    } catch {
      setMensajeRepaso('No se pudo guardar el repaso.');
    }
  };

  const fijarReto = async (juego: Mecanica, valor: string) => {
    if (!sid) return;
    await setDoc(
      doc(dbTutor(), 'planes', sid),
      { retoFijo: { [juego]: valor === 'auto' ? deleteField() : Number(valor) }, actualizado: serverTimestamp() },
      { merge: true },
    );
    recargar();
  };

  const ejes = { stroke: '#2d343660', fontSize: 13 };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
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
        <button type="button" className={estilos.botonSuave} onClick={recargar} disabled={cargando}>
          {cargando ? 'Cargando…' : 'Actualizar'}
        </button>
        {error && <span className="font-bold text-[#c0662b]">{error}</span>}
      </div>

      {!m || !datos ? (
        <p className={estilos.tarjeta}>{alumnas.length === 0 ? 'Crea primero un alumno.' : 'Cargando…'}</p>
      ) : datos.respuestas.length === 0 ? (
        <p className={estilos.tarjeta}>Todavía no hay partidas registradas. Las métricas aparecerán cuando juegue.</p>
      ) : (
        <>
          {/* Cifras clave */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Dato titulo="Respuestas registradas" valor={datos.respuestas.length.toLocaleString('es-ES')} />
            <Dato titulo="Acierto global" valor={`${m.acierto} %`} />
            <Dato
              titulo="Palabras correctas por minuto"
              valor={m.ultimoPcpm !== null ? String(m.ultimoPcpm) : '—'}
              nota={m.mejorPcpm !== null ? `última carrera · mejor: ${m.mejorPcpm}` : 'aún no ha hecho la carrera'}
            />
            <Dato titulo={tipo === 'silaba' ? 'Sílabas dominadas' : 'Grafemas dominados'} valor={String(m.dominadas.length)} />
          </div>

          {/* Reto adaptativo */}
          <section className={estilos.tarjeta}>
            <h2 className="text-xl font-bold">Reto adaptativo (escalón 1–5 por juego)</h2>
            <p className="mb-3 text-sm text-tinta/60">
              Sube con dos partidas seguidas ≥ 85 % de acierto a la primera; baja con dos seguidas &lt; 60 %. Puedes
              fijarlo a mano. La carrera no se adapta: es la medida de las palabras correctas por minuto.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="text-sm text-tinta/60">
                  <tr>
                    <th className="py-2">Juego</th>
                    <th className="py-2">Escalón</th>
                    <th className="py-2">Último cambio</th>
                    <th className="py-2">Modo</th>
                  </tr>
                </thead>
                <tbody>
                  {JUEGOS_ADAPTABLES.map((juego) => {
                    const r = m.retos[juego];
                    const escalon = r?.escalon ?? ESCALON_INICIAL;
                    const ultimo = r?.cambios[r.cambios.length - 1];
                    return (
                      <tr key={juego} className="border-t border-arena">
                        <td className="py-2 font-bold">{NOMBRE_JUEGO[juego]}</td>
                        <td>
                          <span className="flex gap-1" aria-label={`escalón ${escalon} de 5`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n} className={`block h-4 w-6 rounded ${n <= escalon ? 'bg-[#008a7c]' : 'bg-crema'}`} />
                            ))}
                            <span className="ml-2 font-bold">{escalon}</span>
                          </span>
                        </td>
                        <td className="text-sm text-tinta/70">
                          {ultimo
                            ? `${ultimo.a > ultimo.de ? '▲ subió' : '▼ bajó'} a ${ultimo.a} el ${ultimo.fecha.toLocaleDateString('es-ES')}`
                            : r?.fijo
                              ? `automático sería ${r.automatico}`
                              : '—'}
                        </td>
                        <td>
                          <select
                            className="min-h-10 rounded-lg border-2 border-arena bg-white px-2"
                            value={r?.fijo ? String(r.escalon) : 'auto'}
                            onChange={(e) => void fijarReto(juego, e.target.value)}
                          >
                            <option value="auto">Automático</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                Fijo en {n}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mapa de calor */}
          <section className={estilos.tarjeta}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="flex-1 text-xl font-bold">Mapa de calor: acierto y tiempo mediano de respuesta</h2>
              {(['silaba', 'grafema'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={tipo === t ? estilos.boton : estilos.botonSuave}
                >
                  {t === 'silaba' ? 'Sílabas' : 'Grafemas'}
                </button>
              ))}
            </div>
            <MapaCalor celdas={m.calor} />
          </section>

          {/* Dominadas y a reforzar */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className={estilos.tarjeta}>
              <h2 className="text-xl font-bold">Dominadas ({m.dominadas.length})</h2>
              <p className="mb-3 text-sm text-tinta/60">≥ 90 % en sus últimos 10 intentos, en al menos 2 días distintos.</p>
              <div className="flex flex-wrap gap-2">
                {m.dominadas.length === 0 && <span className="text-tinta/60">Ninguna todavía.</span>}
                {m.dominadas.map((u) => (
                  <span key={u} className="rounded-lg bg-[#e3f3f1] px-3 py-1 font-lectura text-xl font-bold text-[#00786c]">
                    {u}
                  </span>
                ))}
              </div>
            </div>
            <div className={estilos.tarjeta}>
              <h2 className="text-xl font-bold">A reforzar ({m.reforzar.length})</h2>
              <p className="mb-3 text-sm text-tinta/60">Con 5 intentos o más y sin dominar. De peor a mejor.</p>
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {m.reforzar.map((e) => (
                  <li key={e.unidad}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-crema">
                      <input
                        type="checkbox"
                        className="size-5 accent-[#008a7c]"
                        checked={elegidas.has(e.unidad)}
                        onChange={() =>
                          setElegidas((s) => {
                            const n = new Set(s);
                            if (n.has(e.unidad)) n.delete(e.unidad);
                            else n.add(e.unidad);
                            return n;
                          })
                        }
                      />
                      <span className="w-20 font-lectura text-xl font-bold">{e.unidad}</span>
                      <span className="text-sm text-tinta/70">
                        {e.porcentajeReciente} % en los últimos {Math.min(10, e.intentos)} · {e.intentos} intentos
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`${estilos.boton} mt-3`}
                disabled={elegidas.size === 0}
                onClick={() => void crearRepaso()}
              >
                Crear nivel de repaso con {elegidas.size}
              </button>
              {mensajeRepaso && <p className="mt-2 text-sm font-bold">{mensajeRepaso}</p>}
            </div>
          </section>

          {/* Evolución semanal: dos gráficas (nunca dos escalas en una) */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className={estilos.tarjeta}>
              <h2 className="mb-2 text-xl font-bold">Palabras correctas por minuto (media semanal)</h2>
              {m.semanas.some((s) => s.pcpm !== null) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={m.semanas} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#2d343618" vertical={false} />
                    <XAxis dataKey="etiqueta" tick={ejes} tickLine={false} axisLine={false} />
                    <YAxis tick={ejes} tickLine={false} axisLine={false} width={36} />
                    <Tooltip formatter={(v) => [`${String(v)} PCPM`, 'Media']} />
                    <Line type="monotone" dataKey="pcpm" stroke={COLOR_TUTORIA} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-tinta/60">Aparecerá cuando haga la carrera contra el fantasma.</p>
              )}
            </div>
            <div className={estilos.tarjeta}>
              <h2 className="mb-2 text-xl font-bold">Estrellas ganadas por semana</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={m.semanas} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#2d343618" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={ejes} tickLine={false} axisLine={false} />
                  <YAxis tick={ejes} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                  <Tooltip formatter={(v) => [String(v), 'Estrellas']} cursor={{ fill: '#2d343610' }} />
                  <Bar dataKey="estrellas" fill={COLOR_TUTORIA} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Tipos de error */}
          <section className={estilos.tarjeta}>
            <h2 className="mb-2 text-xl font-bold">Tipos de error</h2>
            {m.errores.length === 0 ? (
              <p className="text-tinta/60">Sin errores registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, m.errores.length * 44)}>
                <BarChart data={m.errores} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" tick={ejes} tickLine={false} axisLine={false} width={150} />
                  <Tooltip formatter={(v) => [String(v), 'Errores']} cursor={{ fill: '#2d343610' }} />
                  <Bar dataKey="cantidad" fill={COLOR_CASA} radius={[0, 4, 4, 0]} maxBarSize={28}>
                    <LabelList dataKey="cantidad" position="right" fill="#2d3436" fontSize={14} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Casa / tutoría */}
          <section className={estilos.tarjeta}>
            <h2 className="mb-3 text-xl font-bold">Casa y tutoría</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="text-sm text-tinta/60">
                  <tr>
                    <th className="py-2"></th>
                    <th className="py-2">Respuestas</th>
                    <th className="py-2">Acierto</th>
                    <th className="py-2">Tiempo mediano</th>
                    <th className="py-2">PCPM medio</th>
                    <th className="py-2">Sesiones</th>
                    <th className="py-2">Minutos</th>
                  </tr>
                </thead>
                <tbody>
                  {m.contextos.map((c) => (
                    <tr key={c.contexto} className="border-t border-arena">
                      <td className="py-2 font-bold">
                        <span
                          className="mr-2 inline-block size-3 rounded-sm"
                          style={{ background: c.contexto === 'casa' ? COLOR_CASA : COLOR_TUTORIA }}
                        />
                        {c.contexto === 'casa' ? 'Casa' : 'Tutoría'}
                      </td>
                      <td>{c.respuestas}</td>
                      <td>{c.porcentajeAcierto} %</td>
                      <td>{segundos(c.latenciaMedianaMs)}</td>
                      <td>{c.pcpmMedia ?? '—'}</td>
                      <td>{c.sesiones}</td>
                      <td>{c.minutos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 mt-5 font-bold">Constancia: minutos de juego por semana</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.semanas} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke="#2d343618" vertical={false} />
                <XAxis dataKey="etiqueta" tick={ejes} tickLine={false} axisLine={false} />
                <YAxis tick={ejes} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: '#2d343610' }}
                  formatter={(v, nombre) => [`${String(v)} min`, String(nombre)]}
                  labelFormatter={(l) => `Semana del ${String(l)}`}
                />
                <Legend />
                <Bar dataKey="minutosCasa" name="Casa" fill={COLOR_CASA} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="minutosTutoria" name="Tutoría" fill={COLOR_TUTORIA} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-sm text-tinta/60">
              Sesiones por semana (días con juego):{' '}
              {m.semanas.map((s) => `${s.etiqueta}: ${s.sesionesCasa} en casa, ${s.sesionesTutoria} en tutoría`).join(' · ')}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
