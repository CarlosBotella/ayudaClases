import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SesionTutorProvider, useAdulto } from '../sesion/SesionTutor.tsx';
import AdminMarco from './AdminMarco.tsx';
import AdminAlumnas from './AdminAlumnas.tsx';
import AdminContenido from './AdminContenido.tsx';
import AdminGenerar from './AdminGenerar.tsx';
import AdminMetricas from './AdminMetricas.tsx';
import AdminDeberes from './AdminDeberes.tsx';
import AdminTutores from './AdminTutores.tsx';

/** Pantallas solo para el administrador (las reglas también lo impiden). */
function SoloAdmin({ children }: { children: ReactNode }) {
  return useAdulto().esAdmin ? children : <Navigate to="/admin" replace />;
}

/** Rutas del panel (se cargan aparte, bajo demanda). */
export default function RutasAdmin() {
  return (
    <SesionTutorProvider>
      <Routes>
        <Route element={<AdminMarco />}>
          <Route index element={<AdminAlumnas />} />
          <Route path="contenido" element={<AdminContenido />} />
          <Route path="generar/:mundo" element={<AdminGenerar />} />
          <Route path="tutores" element={<SoloAdmin><AdminTutores /></SoloAdmin>} />
          <Route path="metricas" element={<AdminMetricas />} />
          <Route path="deberes" element={<AdminDeberes />} />
        </Route>
      </Routes>
    </SesionTutorProvider>
  );
}
