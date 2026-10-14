/**
 * Vinculación de la tablet (la hace un adulto): se teclea el código de 6
 * dígitos que genera el tutor en su panel. El código indica la alumna y si
 * la tablet es de casa o de tutoría.
 */
import { useState } from 'react';
import { useSesionNina } from '../sesion/SesionNina.tsx';

export default function Vincular() {
  const { vincular } = useSesionNina();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pulsar = (d: string) => {
    setError(null);
    setCodigo((c) => (c.length < 6 ? c + d : c));
  };

  const enviar = async () => {
    setEnviando(true);
    setError(await vincular(codigo));
    setEnviando(false);
  };

  return (
    <main className="flex h-full items-center justify-center gap-16 px-8 font-sans">
      <div className="max-w-sm">
        <h1 className="texto-lectura text-[96px] font-bold text-mar">hola</h1>
        <p className="mt-4 text-xl text-tinta/80">
          Para empezar, pide al tutor un <strong>código de 6 números</strong> desde su panel y escríbelo aquí.
        </p>
        <p className="mt-6 text-base text-tinta/60">
          ¿Eres el tutor?{' '}
          <a href="#/admin" className="font-bold text-mar underline">
            Entra en el panel
          </a>
        </p>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-2" aria-label={`Código: ${codigo}`}>
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="flex h-20 w-14 items-center justify-center rounded-2xl bg-white text-5xl font-bold text-tinta shadow-inner"
            >
              {codigo[i] ?? ''}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" onClick={() => pulsar(d)} className="size-20 rounded-2xl bg-white text-4xl font-bold text-mar shadow active:scale-95">
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCodigo((c) => c.slice(0, -1))}
            className="size-20 rounded-2xl bg-white/60 text-lg font-bold text-tinta/70 shadow active:scale-95"
          >
            Borrar
          </button>
          <button type="button" onClick={() => pulsar('0')} className="size-20 rounded-2xl bg-white text-4xl font-bold text-mar shadow active:scale-95">
            0
          </button>
          <button
            type="button"
            disabled={codigo.length !== 6 || enviando}
            onClick={() => void enviar()}
            className="size-20 rounded-2xl bg-sol text-lg font-bold text-white shadow disabled:opacity-40"
          >
            {enviando ? '…' : 'Listo'}
          </button>
        </div>

        <p className="min-h-7 max-w-xs text-center text-lg font-bold text-[#c0662b]" role="alert">
          {error}
        </p>
      </div>
    </main>
  );
}
