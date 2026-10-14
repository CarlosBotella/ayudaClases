/**
 * La app tiene dos zonas: la de la niña (sin historial: el "atrás" no hace
 * nada) y el panel del tutor (…/#/admin). Se cambia de una a otra con el hash.
 */
export type Zona = 'nina' | 'tutor';

export function zonaActual(): Zona {
  return window.location.hash.startsWith('#/admin') ? 'tutor' : 'nina';
}

export function irAlPanel(): void {
  window.location.hash = '#/admin';
}

export function irALaApp(): void {
  window.location.hash = '#/';
}
