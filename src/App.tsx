import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SesionNinaProvider } from './sesion/SesionNina.tsx';
import { SesionTutorProvider } from './sesion/SesionTutor.tsx';
import Inicio from './pantallas/Inicio.tsx';
import Mundo from './pantallas/Mundo.tsx';
import Jugar from './pantallas/Jugar.tsx';
import Album from './pantallas/Album.tsx';
import ZonaAdulto from './pantallas/ZonaAdulto.tsx';
import Celebracion from './pantallas/Celebracion.tsx';
import Creditos from './pantallas/Creditos.tsx';
import AdminMarco from './admin/AdminMarco.tsx';
import AdminAlumnas from './admin/AdminAlumnas.tsx';
import AdminContenido from './admin/AdminContenido.tsx';
import AdminGenerar from './admin/AdminGenerar.tsx';

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

function RutasAdmin() {
  return (
    <SesionTutorProvider>
      <Routes>
        <Route element={<AdminMarco />}>
          <Route index element={<AdminAlumnas />} />
          <Route path="contenido" element={<AdminContenido />} />
          <Route path="generar/:mundo" element={<AdminGenerar />} />
        </Route>
      </Routes>
    </SesionTutorProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/admin/*" element={<RutasAdmin />} />
        <Route path="/*" element={<RutasNina />} />
      </Routes>
    </HashRouter>
  );
}
