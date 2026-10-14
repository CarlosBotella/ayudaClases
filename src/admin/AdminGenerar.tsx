/**
 * "Generar mundo N": descarga las fuentes, filtra, muestra la rejilla de
 * revisión (pictograma, palabra, sílabas y casilla), genera los niveles y
 * las frases de las palabras aprobadas, y guarda contenido/mundo-N.
 * Todo ocurre en el navegador, sin IA.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { dbTutor } from '../firebase.ts';
import { ContenidoZ, SCHEMA_VERSION, type Nivel } from '../datos/esquemas.ts';
import { MUNDOS } from '../lib/clasificador.ts';
import { descargarFuentes } from '../generador/fuentes.ts';
import { construirCandidatas, resumenPorMundo, type Candidata } from '../generador/candidatas.ts';
import { generarMundo, type ResultadoMundo } from '../generador/niveles.ts';
import Pictograma from '../componentes/Pictograma.tsx';
import { estilos } from './AdminMarco.tsx';

/** Máximo de palabras por mundo (el documento debe quedar muy por debajo de 1 MB). */
const MAX_PALABRAS = 200;
/** Cuántas se marcan por defecto la primera vez (las más frecuentes). */
const MARCADAS_POR_DEFECTO = 120;

// Las fuentes se descargan una vez por sesión, aunque se generen varios mundos.
let cache: { candidatas: Candidata[]; diccionario: Set<string> } | null = null;

type Fase =
  | { tipo: 'descargando'; mensaje: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'revision' }
  | { tipo: 'vista-previa'; resultado: ResultadoMundo; palabras: Candidata[] }
  | { tipo: 'guardando' }
  | { tipo: 'guardado'; resultado: ResultadoMundo; palabras: number };

/** Descripción corta de un nivel para la vista previa. */
function describir(n: Nivel): string {
  switch (n.mecanica) {
    case 'intrusa':
      return `secreta «${n.secreta}»${n.audioAuto ? '' : ' · sin audio'}: ${n.items.map((i) => i.conIntrusa).join(', ')}`;
    case 'burbujas':
      return `pescar «${n.objetivo}» entre ${n.distractores.map((d) => `${d.texto} (${d.tipo})`).join(', ')}`;
    case 'tren':
      return n.items.map((i) => `${i.piezas.join('·')} [trampa: ${i.trampas.map((t) => t.texto).join(', ')}]`).join(' | ');
    case 'detective':
      return n.items.map((i) => `«${i.frase}» (${i.escenas.length} dibujos)`).join(' | ');
    case 'carrera':
      return n.palabras.join(', ');
  }
}

export default function AdminGenerar() {
  const mundo = Number(useParams().mundo);
  const def = MUNDOS.find((m) => m.n === mundo);
  const [fase, setFase] = useState<Fase>({ tipo: 'descargando', mensaje: 'Preparando…' });
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [semilla, setSemilla] = useState(mundo * 7919);

  // 1. Descargar (o reutilizar) las fuentes y preparar la selección inicial.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        if (!cache) {
          const { frecuencias, pictogramas } = await descargarFuentes((mensaje) => {
            if (activo) setFase({ tipo: 'descargando', mensaje });
          });
          if (activo) setFase({ tipo: 'descargando', mensaje: 'Silabeando y clasificando por mundos…' });
          cache = { candidatas: construirCandidatas(frecuencias, pictogramas), diccionario: new Set(frecuencias.keys()) };
        }
        // Si el mundo ya existía, se conservan sus palabras aprobadas.
        const previo = await getDoc(doc(dbTutor(), 'contenido', `mundo-${mundo}`));
        const r = previo.exists() ? ContenidoZ.safeParse(previo.data()) : null;
        const delMundo = cache.candidatas.filter((c) => c.mundo === mundo).slice(0, MAX_PALABRAS);
        const iniciales = r?.success
          ? new Set(Object.keys(r.data.palabras))
          : new Set(delMundo.filter((c) => c.comun).slice(0, MARCADAS_POR_DEFECTO).map((c) => c.texto));
        if (activo) {
          setMarcadas(iniciales);
          setFase({ tipo: 'revision' });
        }
      } catch (e) {
        if (activo) setFase({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      activo = false;
    };
  }, [mundo]);

  const delMundo = useMemo(
    () => (cache ? cache.candidatas.filter((c) => c.mundo === mundo).slice(0, MAX_PALABRAS) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mundo, fase.tipo],
  );
  const resumen = useMemo(() => (cache ? resumenPorMundo(cache.candidatas) : {}), [fase.tipo]);

  const alternar = (t: string) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  const previsualizar = (nuevaSemilla = semilla) => {
    if (!cache) return;
    const palabras = delMundo.filter((c) => marcadas.has(c.texto));
    const resultado = generarMundo(mundo, palabras, cache.diccionario, nuevaSemilla);
    setFase({ tipo: 'vista-previa', resultado, palabras });
  };

  const guardar = async (resultado: ResultadoMundo, palabras: Candidata[]) => {
    setFase({ tipo: 'guardando' });
    const documento = {
      schemaVersion: SCHEMA_VERSION,
      mundo,
      palabras: Object.fromEntries(palabras.map((p) => [p.texto, { silabas: p.silabas, img: p.img }])),
      niveles: resultado.niveles,
      frases: resultado.frases,
      actualizado: serverTimestamp(),
    };
    const valido = ContenidoZ.safeParse(documento);
    const tamano = new Blob([JSON.stringify(documento)]).size;
    if (!valido.success) {
      setFase({ tipo: 'error', mensaje: `El contenido generado no es válido: ${valido.error.issues[0]?.message ?? ''}` });
      return;
    }
    if (tamano > 900_000) {
      setFase({ tipo: 'error', mensaje: `El documento ocupa ${Math.round(tamano / 1024)} KB: desmarca palabras.` });
      return;
    }
    try {
      await setDoc(doc(dbTutor(), 'contenido', `mundo-${mundo}`), documento);
      setFase({ tipo: 'guardado', resultado, palabras: palabras.length });
    } catch {
      setFase({ tipo: 'error', mensaje: 'No se pudo guardar. ¿Hay conexión? ¿Están publicadas las reglas?' });
    }
  };

  if (!def) return <p>Ese mundo no existe.</p>;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex items-center gap-4">
        <Link to="/admin/contenido" className={estilos.botonSuave}>
          ← Contenido
        </Link>
        <h1 className="text-2xl font-bold text-mar">
          Mundo {mundo}: {def.nombre}
        </h1>
      </div>

      {fase.tipo === 'descargando' && <p className={estilos.tarjeta}>⏳ {fase.mensaje}</p>}
      {fase.tipo === 'guardando' && <p className={estilos.tarjeta}>⏳ Guardando…</p>}
      {fase.tipo === 'error' && (
        <div className={estilos.tarjeta}>
          <p className="font-bold text-[#c0662b]">{fase.mensaje}</p>
          <button type="button" className={`${estilos.boton} mt-3`} onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      )}

      {fase.tipo === 'revision' && (
        <>
          <section className={estilos.tarjeta}>
            <h2 className="mb-2 font-bold">Palabras que salen por mundo (frecuentes + con pictograma + decodificables)</h2>
            <div className="flex flex-wrap gap-3">
              {MUNDOS.map((m) => (
                <span key={m.n} className={`rounded-xl px-3 py-1 ${m.n === mundo ? 'bg-mar text-white' : 'bg-crema'}`}>
                  Mundo {m.n}: <strong>{resumen[m.n]?.comunes ?? 0}</strong>
                  {(resumen[m.n]?.total ?? 0) > (resumen[m.n]?.comunes ?? 0) &&
                    ` (+${(resumen[m.n]?.total ?? 0) - (resumen[m.n]?.comunes ?? 0)} nombres propios)`}
                </span>
              ))}
            </div>
          </section>

          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-crema/95 py-2">
            <span className="font-bold">
              {marcadas.size} de {delMundo.length} marcadas
            </span>
            <button type="button" className={estilos.botonSuave} onClick={() => setMarcadas(new Set(delMundo.map((c) => c.texto)))}>
              Marcar todas
            </button>
            <button type="button" className={estilos.botonSuave} onClick={() => setMarcadas(new Set())}>
              Desmarcar todas
            </button>
            <span className="flex-1" />
            <button type="button" className={estilos.boton} disabled={marcadas.size < 5} onClick={() => previsualizar()}>
              Generar niveles →
            </button>
          </div>

          <p className="text-sm text-tinta/70">
            Desmarca lo raro (palabras que no son para niños, dibujos confusos…). Las marcadas en gris son nombres propios
            en ARASAAC: revísalas antes de marcarlas.
          </p>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {delMundo.map((c) => {
              const activa = marcadas.has(c.texto);
              return (
                <label
                  key={c.texto}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-4 bg-white p-2 ${
                    activa ? 'border-mar' : 'border-transparent opacity-50'
                  } ${c.comun ? '' : 'bg-tinta/5'}`}
                >
                  <Pictograma id={c.img} tamano={90} />
                  <span className="texto-lectura text-2xl font-bold">{c.texto}</span>
                  <span className="text-sm text-tinta/60">{c.silabas.join(' · ')}</span>
                  <input type="checkbox" className="size-6 accent-[#2f8f83]" checked={activa} onChange={() => alternar(c.texto)} />
                </label>
              );
            })}
          </div>
        </>
      )}

      {fase.tipo === 'vista-previa' && (
        <>
          <section className={estilos.tarjeta}>
            <h2 className="mb-2 text-xl font-bold">Vista previa · {fase.palabras.length} palabras</h2>
            {fase.resultado.avisos.map((a) => (
              <p key={a} className="font-bold text-[#c0662b]">⚠️ {a}</p>
            ))}
            <ol className="mt-3 flex flex-col gap-2">
              {fase.resultado.niveles.map((n, i) => (
                <li key={n.id} className="rounded-xl bg-crema px-3 py-2">
                  <strong>
                    {i + 1}. {n.titulo}
                  </strong>{' '}
                  <span className="text-sm text-tinta/80">— {describir(n)}</span>
                </li>
              ))}
            </ol>
            <h3 className="mt-4 font-bold">Frases ({fase.resultado.frases.length})</h3>
            <p className="text-tinta/80">{fase.resultado.frases.map((f) => f.texto).join(' · ') || '—'}</p>
          </section>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={estilos.botonSuave} onClick={() => setFase({ tipo: 'revision' })}>
              ← Volver a la revisión
            </button>
            <button
              type="button"
              className={estilos.botonSuave}
              onClick={() => {
                const s = semilla + 1;
                setSemilla(s);
                previsualizar(s);
              }}
            >
              Otra variante
            </button>
            <button type="button" className={estilos.boton} onClick={() => void guardar(fase.resultado, fase.palabras)}>
              Guardar mundo {mundo}
            </button>
          </div>
        </>
      )}

      {fase.tipo === 'guardado' && (
        <section className={estilos.tarjeta}>
          <h2 className="text-xl font-bold text-mar">✅ Mundo {mundo} guardado</h2>
          <p className="mt-2">
            {fase.palabras} palabras, {fase.resultado.niveles.length} niveles y {fase.resultado.frases.length} frases. Ya
            aparece abierto en las tablets vinculadas.
          </p>
          <Link to="/admin/contenido" className={`${estilos.boton} mt-4`}>
            Volver a Contenido
          </Link>
        </section>
      )}
    </div>
  );
}
