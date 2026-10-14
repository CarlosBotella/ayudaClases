/**
 * Marco del panel: entrar / crear cuenta, verificación del email, permiso y menú.
 * Es una zona de adultos: tipografía normal, pantallas con texto.
 * El administrador ve además las pestañas Contenido y Tutores.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { irALaApp } from '../lib/zonas.ts';
import { useSesionTutor } from '../sesion/SesionTutor.tsx';
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
  const { entrar, crearCuenta, recuperarContrasena } = useSesionTutor();
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje(modo === 'entrar' ? await entrar(email, contrasena) : await crearCuenta(email, contrasena));
    setEnviando(false);
  };

  return (
    <Centro>
      <h1 className="mb-2 text-2xl font-bold text-mar">Panel del tutor</h1>
      <div className="mb-5 flex gap-2">
        {(['entrar', 'crear'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setModo(m);
              setMensaje(null);
            }}
            className={modo === m ? estilos.boton : estilos.botonSuave}
          >
            {m === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        ))}
      </div>
      {modo === 'crear' && (
        <p className="mb-4 text-sm text-tinta/70">
          Usa el email con el que te ha dado de alta el administrador. Te llegará un correo para verificarlo.
        </p>
      )}
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
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
        </label>
        <button className={estilos.boton} disabled={enviando || !contrasena}>
          {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
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

function Verificar({ email }: { email: string }) {
  const { enviarVerificacion, comprobar, salir } = useSesionTutor();
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <Centro>
      <h1 className="mb-4 text-2xl font-bold text-mar">Verifica tu email</h1>
      <p className="mb-6 text-tinta/80">
        Por seguridad, el panel solo se abre con el email verificado. Pulsa el botón, abre el correo que te llegará a{' '}
        <strong>{email}</strong> (mira también en spam) y pulsa su enlace. Después vuelve aquí.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className={estilos.boton}
          onClick={() => void enviarVerificacion().then((m) => setMensaje(m ?? 'Correo enviado. Revisa tu bandeja de entrada.'))}
        >
          Enviar correo de verificación
        </button>
        <button type="button" className={estilos.botonSuave} onClick={() => void comprobar()}>
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
  const { estado, salir, comprobar } = useSesionTutor();

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
      return <Verificar email={estado.usuario.email ?? ''} />;
    case 'sin-permiso':
      return (
        <Centro>
          <h1 className="mb-3 text-2xl font-bold text-mar">Cuenta sin autorizar</h1>
          <p className="mb-4">
            Has entrado como <strong>{estado.email}</strong>, pero el administrador aún no te ha dado de alta como tutor (o
            te ha desactivado). Pídele que añada este email en la pestaña «Tutores» y vuelve a comprobarlo.
          </p>
          <div className="flex flex-col gap-3">
            <button type="button" className={estilos.boton} onClick={() => void comprobar()}>
              Comprobar otra vez
            </button>
            <button type="button" className={estilos.botonSuave} onClick={() => void salir()}>
              Salir
            </button>
          </div>
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
        <span className="mr-4 flex flex-col leading-tight">
          <span className="text-xl font-bold text-mar-oscuro">Panel del tutor</span>
          <span className="text-xs text-tinta/60">
            {estado.nombre} {estado.esAdmin ? '· administrador' : ''}
          </span>
        </span>
        <NavLink to="/admin" end className={pestana}>
          Alumnos y tablets
        </NavLink>
        <NavLink to="/admin/contenido" className={pestana}>
          Contenido
        </NavLink>
        <NavLink to="/admin/deberes" className={pestana}>
          Deberes
        </NavLink>
        <NavLink to="/admin/metricas" className={pestana}>
          Métricas
        </NavLink>
        {estado.esAdmin && (
          <NavLink to="/admin/tutores" className={pestana}>
            Tutores
          </NavLink>
        )}
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
