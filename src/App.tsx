import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SesionNinaProvider } from './sesion/SesionNina.tsx';
import Inicio from './pantallas/Inicio.tsx';
import Mundo from './pantallas/Mundo.tsx';
import Jugar from './pantallas/Jugar.tsx';
import JugarExtra from './pantallas/JugarExtra.tsx';
import Mochila from './pantallas/Mochila.tsx';
import Album from './pantallas/Album.tsx';
import ZonaAdulto from './pantallas/ZonaAdulto.tsx';
import Celebracion from './pantallas/Celebracion.tsx';
import Creditos from './pantallas/Creditos.tsx';
import Cargando from './componentes/Cargando.tsx';
import { zonaActual, type Zona } from './lib/zonas.ts';

// El panel del tutor (y el generador) se descargan solo si se entra en él:
// la tablet de la niña no carga ese código.
const RutasAdmin = lazy(() => import('./admin/RutasAdmin.tsx'));

/**
 * Bloquea el "atrás" del navegador (gesto de arrastrar desde el borde, botón
 * o gesto de Android) mientras juega la niña: se mete una entrada "trampa" en
 * el historial y, si se intenta volver, se vuelve a meter. Así nunca sale de
 * la pantalla en la que está por accidente.
 */
function useBloquearAtras() {
  useEffect(() => {
    const atrapar = () => window.history.pushState({ trampa: true }, '', window.location.href);
    atrapar();
    const alVolver = () => {
      if (zonaActual() === 'nina') atrapar();
    };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);
}

/**
 * Zona de la niña: enrutador EN MEMORIA. Moverse por la app no crea entradas
 * en el historial del navegador, así que el gesto de "atrás" no tiene adónde ir.
 */
function ZonaNina() {
  useBloquearAtras();
  return (
    <MemoryRouter>
      <SesionNinaProvider>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/mundo/:mundo" element={<Mundo />} />
          <Route path="/jugar/:mundo/:nivelId" element={<Jugar />} />
          <Route path="/profe/:mundo/:juego" element={<JugarExtra />} />
          <Route path="/escribir/:mundo/:juego" element={<JugarExtra />} />
          <Route path="/mochila" element={<Mochila />} />
          <Route path="/album" element={<Album />} />
          <Route path="/adulto" element={<ZonaAdulto />} />
          <Route path="/fin" element={<Celebracion />} />
          <Route path="/creditos" element={<Creditos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SesionNinaProvider>
    </MemoryRouter>
  );
}

/**
 * Zona del tutor: HashRouter normal (…/ayudaClases/#/admin), con su "atrás"
 * de siempre. GitHub Pages no sabe redirigir rutas sin "#".
 */
function ZonaTutor() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<Cargando />}>
              <RutasAdmin />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  const [zona, setZona] = useState<Zona>(zonaActual);

  useEffect(() => {
    const alCambiar = () => setZona(zonaActual());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  return zona === 'tutor' ? <ZonaTutor /> : <ZonaNina />;
}
