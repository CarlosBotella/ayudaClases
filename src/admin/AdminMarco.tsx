/**
 * Marco del panel del tutor: login, verificación del email y menú.
 * Es una zona de adultos: tipografía normal, pantallas con texto.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { irALaApp } from '../lib/zonas.ts';
import { useSesionTutor } from '../sesion/SesionTutor.tsx';
import { EMAIL_TUTOR } from '../datos/esquemas.ts';
import Cargando from '../componentes/Cargando.tsx';

export const estilos = {
  tarjeta: 'rounded-2xl bg-white p-5 shadow-sm',
  boton: 'inline-flex min-h-12 items-center justify-center rounded-xl bg-mar px-5 font-bold text-white disabled:opacity-40',
  botonSuave: 'inline-flex min-h-12 items-center justify-center rounded-xl bg-arena px-5 font-bold text-tinta disabled:opacity-40',
  campo: 'min-h-12 w-full rounded-xl border-2 border-arena bg-white px-4 text-lg outline-none focus:border-mar',
};

function Centro({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-full items-center justify-center overflow-y-auto bg-crema p-6 font-sans">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">{children}</div>
    </main>
  );
}

function Login() {
  const { entrar, recuperarContrasena } = useSesionTutor();
  const [email, setEmail] = useState(EMAIL_TUTOR);
  const [contrasena, setContrasena] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje(await entrar(email, contrasena));
    setEnviando(false);
  };

  return (
    <Centro>
      <h1 className="mb-6 text-2xl font-bold text-mar">Panel del tutor</h1>
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-tinta/70">Email</span>
          <input className={estilos.campo} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-tinta/70">Contraseña</span>
          <input
            className={estilos.campo}
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
        </label>
        <button className={estilos.boton} disabled={enviando || !contrasena}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        {mensaje && <p className="text-center font-bold text-[#c0662b]">{mensaje}</p>}
        <button
          type="button"
          className="text-sm text-mar underline"
          onClick={() => void recuperarContrasena(email).then((m) => setMensaje(m ?? 'Te hemos enviado un correo para cambiar la contraseña.'))}
        >
          He olvidado la contraseña
        </button>
      </form>
    </Centro>
  );
}

function Verificar() {
  const { enviarVerificacion, comprobarVerificacion, salir } = useSesionTutor();
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <Centro>
      <h1 className="mb-4 text-2xl font-bold text-mar">Verifica tu email</h1>
      <p className="mb-6 text-tinta/80">
        Por seguridad, el panel solo se abre con el email verificado. Pulsa el botón, abre el correo que te llegará a{' '}
        <strong>{EMAIL_TUTOR}</strong> (mira también en spam) y pulsa su enlace. Después vuelve aquí.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className={estilos.boton}
          onClick={() => void enviarVerificacion().then((m) => setMensaje(m ?? 'Correo enviado. Revisa tu bandeja de entrada.'))}
        >
          Enviar correo de verificación
        </button>
        <button type="button" className={estilos.botonSuave} onClick={() => void comprobarVerificacion()}>
          Ya lo he verificado
        </button>
        <button type="button" className="text-sm text-tinta/60 underline" onClick={() => void salir()}>
          Salir
        </button>
      </div>
      {mensaje && <p className="mt-4 text-center font-bold text-mar">{mensaje}</p>}
    </Centro>
  );
}

export default function AdminMarco() {
  const { estado, salir } = useSesionTutor();

  switch (estado.tipo) {
    case 'sin-configurar':
      return (
        <Centro>
          <h1 className="mb-3 text-2xl font-bold text-mar">Falta conectar Firebase</h1>
          <p>Pega la configuración web de Firebase en el chat para que la conecte en <code>src/firebase.ts</code>.</p>
        </Centro>
      );
    case 'cargando':
      return <Cargando />;
    case 'fuera':
      return <Login />;
    case 'sin-verificar':
      return <Verificar />;
    case 'otra-cuenta':
      return (
        <Centro>
          <p className="mb-4">
            Has entrado como <strong>{estado.email}</strong>, que no es la cuenta del tutor.
          </p>
          <button type="button" className={estilos.boton} onClick={() => void salir()}>
            Salir
          </button>
        </Centro>
      );
    case 'dentro':
      break;
  }

  const pestana = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-12 items-center rounded-xl px-4 font-bold ${isActive ? 'bg-mar text-white' : 'text-mar hover:bg-white'}`;

  return (
    <div className="flex h-full flex-col bg-crema font-sans">
      <header className="flex flex-wrap items-center gap-2 border-b border-arena bg-crema/95 px-4 py-2">
        <span className="mr-4 text-xl font-bold text-mar-oscuro">Panel del tutor</span>
        <NavLink to="/admin" end className={pestana}>
          Alumnas y tablets
        </NavLink>
        <NavLink to="/admin/contenido" className={pestana}>
          Contenido
        </NavLink>
        <NavLink to="/admin/metricas" className={pestana}>
          Métricas
        </NavLink>
        <span className="flex-1" />
        <button type="button" className={estilos.botonSuave} onClick={irALaApp}>
          Volver a la app
        </button>
        <button type="button" className="min-h-12 px-3 text-tinta/60 underline" onClick={() => void salir()}>
          Salir
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
