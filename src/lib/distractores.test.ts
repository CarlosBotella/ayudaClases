import { describe, expect, it } from 'vitest';
import { deTipo, distractoresPalabra, distractoresSilaba } from './distractores.ts';

describe('distractoresSilaba', () => {
  it('bla: inversión, omisión, espejo y sonoridad (ejemplo de la pesca)', () => {
    const d = distractoresSilaba('bla');
    expect(d).toContainEqual({ texto: 'bal', tipo: 'inversion' });
    expect(d).toContainEqual({ texto: 'ba', tipo: 'omision' });
    expect(d).toContainEqual({ texto: 'dla', tipo: 'espejo' });
    expect(d).toContainEqual({ texto: 'pla', tipo: 'sonoridad' });
  });

  it('nunca devuelve la propia sílaba ni repetidos', () => {
    for (const s of ['bla', 'pa', 'que', 'dob', 'tren']) {
      const textos = distractoresSilaba(s).map((d) => d.texto);
      expect(textos).not.toContain(s);
      expect(new Set(textos).size).toBe(textos.length);
    }
  });

  it('inversión de sílabas directas e inversas: la ↔ al', () => {
    expect(distractoresSilaba('la')).toContainEqual({ texto: 'al', tipo: 'inversion' });
    expect(distractoresSilaba('al')).toContainEqual({ texto: 'la', tipo: 'inversion' });
  });

  it('omisión en trabada con coda: tren → ten', () => {
    expect(distractoresSilaba('tren')).toContainEqual({ texto: 'ten', tipo: 'omision' });
  });

  it('espejo b↔d y p↔q', () => {
    expect(distractoresSilaba('ba')).toContainEqual({ texto: 'da', tipo: 'espejo' });
    expect(distractoresSilaba('pe')).toContainEqual({ texto: 'qe', tipo: 'espejo' });
  });

  it('sonoridad respeta la ortografía de c/g y qu/gu', () => {
    expect(distractoresSilaba('ca')).toContainEqual({ texto: 'ga', tipo: 'sonoridad' });
    expect(distractoresSilaba('que')).toContainEqual({ texto: 'gue', tipo: 'sonoridad' });
    expect(distractoresSilaba('gui')).toContainEqual({ texto: 'qui', tipo: 'sonoridad' });
    // "ce" suena /θe/: cambiarla por "ge" no es un error de sonoridad.
    expect(distractoresSilaba('ce').map((d) => d.texto)).not.toContain('ge');
  });
});

describe('distractoresPalabra', () => {
  it('plato: palto (inversión) y pato (omisión)', () => {
    const d = distractoresPalabra('plato');
    expect(d).toContainEqual({ texto: 'palto', tipo: 'inversion' });
    expect(d).toContainEqual({ texto: 'pato', tipo: 'omision' });
    expect(d).toContainEqual({ texto: 'blato', tipo: 'sonoridad' });
  });

  it('deTipo filtra por tipo de error', () => {
    const visuales = deTipo(distractoresPalabra('dedo'), 'espejo');
    expect(visuales.map((d) => d.texto)).toEqual(['bedo', 'debo']);
  });
});
