import { Route, Routes } from 'react-router-dom';
import { SesionTutorProvider } from '../sesion/SesionTutor.tsx';
import AdminMarco from './AdminMarco.tsx';
import AdminAlumnas from './AdminAlumnas.tsx';
import AdminContenido from './AdminContenido.tsx';
import AdminGenerar from './AdminGenerar.tsx';
import AdminMetricas from './AdminMetricas.tsx';

/** Rutas del panel del tutor (se cargan aparte, bajo demanda). */
export default function RutasAdmin() {
  return (
    <SesionTutorProvider>
      <Routes>
        <Route element={<AdminMarco />}>
          <Route index element={<AdminAlumnas />} />
          <Route path="contenido" element={<AdminContenido />} />
          <Route path="generar/:mundo" element={<AdminGenerar />} />
          <Route path="metricas" element={<AdminMetricas />} />
        </Route>
      </Routes>
    </SesionTutorProvider>
  );
}
