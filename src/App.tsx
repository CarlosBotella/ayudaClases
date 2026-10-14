import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Inicio from './pantallas/Inicio.tsx';
import Creditos from './pantallas/Creditos.tsx';

/**
 * HashRouter: las rutas viven tras el "#" (…/ayudaClases/#/creditos),
 * porque GitHub Pages no sabe redirigir rutas de una SPA.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/creditos" element={<Creditos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
