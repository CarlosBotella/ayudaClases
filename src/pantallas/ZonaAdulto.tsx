/**
 * Zona de adultos (solo tras la puerta parental): panel del tutor,
 * desvincular la tablet y créditos.
 */
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispositivo, useSesionNina } from '../sesion/SesionNina.tsx';

export default function ZonaAdulto() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const sesion = useDispositivo();
  const { desvincular } = useSesionNina();
  const [confirmar, setConfirmar] = useState(false);

  // Solo se llega aquí desde la puerta parental.
  const desdePuerta = (ubicacion.state as { puerta?: boolean } | null)?.puerta === true;
  if (!desdePuerta) return <Navigate to="/" replace />;

  const boton = 'min-h-16 w-full rounded-2xl px-6 text-left text-xl font-bold shadow active:scale-[.98]';

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col justify-center gap-4 px-6 font-sans">
      <h1 className="mb-2 text-3xl font-bold text-mar">Zona de adultos</h1>
      {sesion && (
        <p className="text-lg text-tinta/70">
          Tablet de <strong>{sesion.dispositivo.nombre}</strong> · {sesion.dispositivo.contexto === 'casa' ? 'en casa' : 'en tutoría'}
        </p>
      )}

      <button type="button" className={`${boton} bg-mar text-white`} onClick={() => navegar('/admin')}>
        Panel del tutor
      </button>
      <button type="button" className={`${boton} bg-white text-mar`} onClick={() => navegar('/creditos')}>
        Créditos
      </button>

      {confirmar ? (
        <div className="rounded-2xl bg-white p-4 shadow">
          <p className="text-lg">¿Seguro? Habrá que volver a meter un código para usar esta tablet.</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="min-h-14 flex-1 rounded-xl bg-[#c0662b] text-lg font-bold text-white"
              onClick={() => void desvincular().then(() => navegar('/', { replace: true }))}
            >
              Sí, desvincular
            </button>
            <button type="button" className="min-h-14 flex-1 rounded-xl bg-arena text-lg font-bold" onClick={() => setConfirmar(false)}>
              No
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${boton} bg-white text-tinta/70`} onClick={() => setConfirmar(true)}>
          Desvincular esta tablet
        </button>
      )}

      <button type="button" className={`${boton} mt-4 bg-sol text-white`} onClick={() => navegar('/', { replace: true })}>
        Volver a jugar
      </button>
    </main>
  );
}
