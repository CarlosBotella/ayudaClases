import { describe, expect, it } from 'vitest';
import { calcularRetos, escalonAutomatico, escalonDe, ESCALON_INICIAL, type PartidaReto } from './adaptativo.ts';

let t = 0;
const p = (puntuacion: number, mecanica: PartidaReto['mecanica'] = 'burbujas'): PartidaReto => ({
  mecanica,
  puntuacion,
  fecha: new Date(2026, 9, 1, 10, t++),
});

describe('escalonAutomatico', () => {
  it('empieza en el escalón inicial', () => {
    expect(escalonAutomatico([]).escalon).toBe(ESCALON_INICIAL);
  });
  it('sube con dos partidas seguidas ≥ 85 %', () => {
    expect(escalonAutomatico([p(0.9), p(0.85)]).escalon).toBe(3);
  });
  it('una sola partida buena no basta', () => {
    expect(escalonAutomatico([p(0.9), p(0.7), p(0.9)]).escalon).toBe(2);
  });
  it('baja con dos partidas seguidas < 60 %', () => {
    expect(escalonAutomatico([p(0.5), p(0.3)]).escalon).toBe(1);
  });
  it('entre 60 y 85 % se queda', () => {
    expect(escalonAutomatico([p(0.7), p(0.8), p(0.6), p(0.84)]).escalon).toBe(2);
  });
  it('tras subir, hacen falta otras dos para volver a subir', () => {
    expect(escalonAutomatico([p(1), p(1), p(1)]).escalon).toBe(3);
    expect(escalonAutomatico([p(1), p(1), p(1), p(1)]).escalon).toBe(4);
  });
  it('no pasa de 1 ni de 5', () => {
    expect(escalonAutomatico(Array.from({ length: 20 }, () => p(1))).escalon).toBe(5);
    expect(escalonAutomatico(Array.from({ length: 20 }, () => p(0))).escalon).toBe(1);
  });
  it('apunta cada cambio', () => {
    const r = escalonAutomatico([p(1), p(1), p(0), p(0)]);
    expect(r.cambios.map((c) => `${c.de}→${c.a}`)).toEqual(['2→3', '3→2']);
  });
  it('ordena por fecha aunque lleguen desordenadas', () => {
    const a = p(1);
    const b = p(1);
    const c = p(0.7);
    expect(escalonAutomatico([c, b, a]).escalon).toBe(3);
  });
});

describe('calcularRetos', () => {
  it('cada juego va por su cuenta', () => {
    const r = calcularRetos([p(1, 'burbujas'), p(1, 'burbujas'), p(0, 'tren'), p(0, 'tren')]);
    expect(r.burbujas?.escalon).toBe(3);
    expect(r.tren?.escalon).toBe(1);
  });
  it('el escalón fijado por el tutor manda, pero se sigue calculando el automático', () => {
    const r = calcularRetos([p(1, 'tren'), p(1, 'tren')], { tren: 1, detective: 4 });
    expect(r.tren).toMatchObject({ escalon: 1, fijo: true, automatico: 3 });
    expect(r.detective).toMatchObject({ escalon: 4, fijo: true });
  });
  it('la carrera no se adapta', () => {
    const r = calcularRetos([p(1, 'carrera'), p(1, 'carrera')]);
    expect(escalonDe(r, 'carrera')).toBe(3);
    expect(escalonDe(r, 'burbujas')).toBe(ESCALON_INICIAL);
  });
});
