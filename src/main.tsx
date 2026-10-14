import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Pide al navegador que NO borre los datos de la app (vinculación, caché
// sin conexión) aunque la tablet se quede sin espacio.
void navigator.storage?.persist?.().catch(() => false);

const raiz = document.getElementById('root');
if (!raiz) throw new Error('No se encontró el elemento #root');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
