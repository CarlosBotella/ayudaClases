import { describe, expect, it } from 'vitest';
import { formatearFechaCorta } from './fecha.ts';

describe('formatearFechaCorta', () => {
  it('convierte a hora de Madrid (verano, UTC+2)', () => {
    expect(formatearFechaCorta('2026-10-14T16:18:00Z')).toBe('14/10/2026 18:18');
  });

  it('convierte a hora de Madrid (invierno, UTC+1)', () => {
    expect(formatearFechaCorta('2026-01-05T08:00:00Z')).toBe('05/01/2026 09:00');
  });

  it('no rompe con una fecha inválida', () => {
    expect(formatearFechaCorta('no-es-una-fecha')).toBe('—');
  });
});
