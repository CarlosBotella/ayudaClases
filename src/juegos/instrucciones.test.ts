import { describe, expect, it } from 'vitest';
import { instruccionDe } from './instrucciones.ts';

describe('instruccionDe', () => {
  it('cada mecánica tiene una frase corta para la niña', () => {
    const niveles = [
      { id: 'a', titulo: '', dificultad: 1, mecanica: 'intrusa', items: [], secreta: 'sol', audioAuto: true },
      {
        id: 'b', titulo: '', dificultad: 1, mecanica: 'burbujas', objetivo: 'pa', patron: 'CV',
        pista: { elementos: [{ palabra: 'pato', escala: 1, copias: 1 }] }, distractores: [],
        meta: 6, velocidad: 10, maxBurbujas: 5, proporcion: 0.4, esFrase: false,
      },
      { id: 'c', titulo: '', dificultad: 1, mecanica: 'tren', items: [] },
      { id: 'd', titulo: '', dificultad: 1, mecanica: 'detective', items: [] },
      { id: 'e', titulo: '', dificultad: 1, mecanica: 'carrera', palabras: ['oso', 'mesa', 'sopa'] },
    ] as const;
    for (const n of niveles) {
      const i = instruccionDe(n as never);
      expect(i.nina.length).toBeGreaterThan(10);
      expect(i.nina.split(' ').length).toBeLessThan(14);
    }
  });

  it('las burbujas dicen la sílaba que hay que pescar', () => {
    const i = instruccionDe({
      id: 'b', titulo: '', dificultad: 1, mecanica: 'burbujas', objetivo: 'bla', patron: 'CCV',
      pista: { elementos: [{ palabra: 'blusa', escala: 1, copias: 1 }] }, distractores: [],
      meta: 6, velocidad: 10, maxBurbujas: 5, proporcion: 0.4, esFrase: false,
    });
    expect(i.nina).toContain('bla');
  });

  it('la carrera explica al adulto qué botones tocar', () => {
    const i = instruccionDe({ id: 'e', titulo: '', dificultad: 1, mecanica: 'carrera', palabras: ['oso', 'mesa', 'sopa'] });
    expect(i.adulto).toContain('✓');
    expect(i.adulto).toContain('✗');
  });
});
