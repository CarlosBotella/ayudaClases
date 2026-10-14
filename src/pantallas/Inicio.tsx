/**
 * Portada: decide qué ver según el estado de la tablet.
 *  - Firebase sin configurar / sin conexión la primera vez → bienvenida con aviso
 *  - sin vincular → teclado del código
 *  - vinculada → mapa de mundos
 */
import { useSesionNina } from '../sesion/SesionNina.tsx';
import Cargando from '../componentes/Cargando.tsx';
import Bienvenida from './Bienvenida.tsx';
import Mapa from './Mapa.tsx';
import Vincular from './Vincular.tsx';

export default function Inicio() {
  const { estado } = useSesionNina();

  switch (estado.tipo) {
    case 'sin-configurar':
      return <Bienvenida aviso="Falta conectar la base de datos (Firebase). El tutor tiene que pegar su configuración." />;
    case 'error':
      return <Bienvenida aviso={estado.mensaje} />;
    case 'cargando':
      return <Cargando />;
    case 'sin-vincular':
      return <Vincular />;
    case 'lista':
      return <Mapa />;
  }
}
