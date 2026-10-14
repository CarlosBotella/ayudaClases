import { describe, expect, it } from 'vitest';
import type { Contenido, Deberes } from '../datos/esquemas.ts';
import { hechasElDia, historialDeberes, nivelParaActividad, semanaDeDeberes } from './deberes.ts';

const deberes: Deberes = { mundo: 1, actividades: ['burbujas', 'trazo'], diasPorSemana: 3, activos: true };
// Semana del lunes 12 al domingo 18 de octubre de 2026.
const dia = (d: number, h = 18) => new Date(2026, 9, d, h);
const partida = (mecanica: 'burbujas' | 'trazo' | 'tren', d: number, extra: Partial<{ mundo: number; contexto: 'casa' | 'tutoria' }> = {}) => ({
  mecanica,
  fecha: dia(d),
  mundo: 1,
  contexto: 'casa' as const,
  ...extra,
});

describe('hechasElDia', () => {
  it('solo cuenta lo hecho en casa, en el mundo de los deberes y ese día', () => {
    const hechas = hechasElDia(
      deberes,
      [
        partida('burbujas', 13),
        partida('trazo', 13, { contexto: 'tutoria' }),
        partida('trazo', 13, { mundo: 2 }),
        partida('tren', 13),
        partida('trazo', 14),
      ],
      dia(13, 9),
    );
    expect([...hechas]).toEqual(['burbujas']);
  });
});

describe('semanaDeDeberes', () => {
  const partidas = [
    partida('burbujas', 12), partida('trazo', 12), // lunes: completo
    partida('burbujas', 14), // miércoles: parcial
    partida('burbujas', 15), partida('trazo', 15, { }), // jueves: completo
  ];
  const s = semanaDeDeberes(deberes, partidas, dia(15), dia(15));

  it('marca días completos, parciales, hoy y futuros', () => {
    expect(s.semana).toBe('2026-10-12');
    expect(s.dias.map((d) => (d.completo ? 'C' : d.parcial ? 'p' : '-')).join('')).toBe('C-pC---');
    expect(s.dias.find((d) => d.esHoy)?.letra).toBe('J');
    expect(s.dias.filter((d) => d.futuro).map((d) => d.letra)).toEqual(['V', 'S', 'D']);
  });

  it('cuenta los días hechos frente al objetivo', () => {
    expect(s.completos).toBe(2);
    expect(s.objetivo).toBe(3);
    expect(s.cumplida).toBe(false);
  });

  it('historial: la semana actual primero', () => {
    const h = historialDeberes(deberes, partidas, dia(20), 2);
    expect(h.map((x) => x.semana)).toEqual(['2026-10-19', '2026-10-12']);
    expect(h[1]?.completos).toBe(2);
  });
});

describe('nivelParaActividad', () => {
  const contenido: Contenido = {
    schemaVersion: 1, mundo: 1, palabras: {}, frases: [], actualizado: null,
    niveles: [
      { id: 'm1-n2', titulo: '', dificultad: 1, mecanica: 'carrera', palabras: ['a', 'b', 'c'] },
      { id: 'm1-n6', titulo: '', dificultad: 3, mecanica: 'carrera', palabras: ['a', 'b', 'c'] },
    ],
  };
  it('elige el nivel de esa actividad con menos estrellas', () => {
    expect(nivelParaActividad(contenido, 'carrera', new Map())?.id).toBe('m1-n2');
    expect(nivelParaActividad(contenido, 'carrera', new Map([['m1-n2', { estrellas: 3 }]]))?.id).toBe('m1-n6');
    expect(nivelParaActividad(contenido, 'tren', new Map())).toBeNull();
  });
});
