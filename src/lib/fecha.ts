/**
 * Formatea una fecha ISO como "14/10/2026 18:30" en hora de Madrid.
 * Si la fecha no es válida devuelve "—" en lugar de romper la pantalla.
 */
export function formatearFechaCorta(iso: string, zonaHoraria = 'Europe/Madrid'): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';

  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: zonaHoraria,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);

  const valor = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((p) => p.type === tipo)?.value ?? '';

  return `${valor('day')}/${valor('month')}/${valor('year')} ${valor('hour')}:${valor('minute')}`;
}
