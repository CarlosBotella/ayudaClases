import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SesionNinaProvider } from './sesion/SesionNina.tsx';
import Inicio from './pantallas/Inicio.tsx';
import Mundo from './pantallas/Mundo.tsx';
import Jugar from './pantallas/Jugar.tsx';
import Album from './pantallas/Album.tsx';
import ZonaAdulto from './pantallas/ZonaAdulto.tsx';
import Celebracion from './pantallas/Celebracion.tsx';
import Creditos from './pantallas/Creditos.tsx';
import Cargando from './componentes/Cargando.tsx';

// El panel del tutor (y el generador) se descargan solo si se entra en él:
// la tablet de la niña no carga ese código.
const RutasAdmin = lazy(() => import('./admin/RutasAdmin.tsx'));

/**
 * HashRouter: las rutas viven tras el "#" (…/ayudaClases/#/mundo/1),
 * porque GitHub Pages no sabe redirigir rutas de una SPA.
 *
 * Dos zonas con sesiones separadas:
 *  - /admin/…  → panel del tutor (email + contraseña)
 *  - el resto  → la niña (sesión anónima de la tablet)
 */
function RutasNina() {
  return (
    <SesionNinaProvider>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/mundo/:mundo" element={<Mundo />} />
        <Route path="/jugar/:mundo/:nivelId" element={<Jugar />} />
        <Route path="/album" element={<Album />} />
        <Route path="/adulto" element={<ZonaAdulto />} />
        <Route path="/fin" element={<Celebracion />} />
        <Route path="/creditos" element={<Creditos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SesionNinaProvider>
  );
}

export default function App() {
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
        <Route path="/*" element={<RutasNina />} />
      </Routes>
    </HashRouter>
  );
}
