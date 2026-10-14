import { describe, expect, it } from 'vitest';
import type { IntentoNivel } from '../datos/esquemas.ts';
import { calcularEstrellas, calcularPcpm } from './estrellas.ts';
import { estrellasDeMundo, nivelDesbloqueado, resumirProgreso } from './progreso.ts';

describe('calcularEstrellas', () => {
  it('completar siempre da al menos 1 estrella', () => {
    expect(calcularEstrellas({ mecanica: 'intrusa', items: 5, aciertosPrimera: 0, duracionMs: 999999 }).estrellas).toBe(1);
  });
  it('60 % a la primera → 2 estrellas', () => {
    expect(calcularEstrellas({ mecanica: 'intrusa', items: 5, aciertosPrimera: 3, duracionMs: 999999 }).estrellas).toBe(2);
  });
  it('85 % y a tiempo → 3 estrellas; fuera de tiempo → 2', () => {
    expect(calcularEstrellas({ mecanica: 'tren', items: 4, aciertosPrimera: 4, duracionMs: 30000 }).estrellas).toBe(3);
    expect(calcularEstrellas({ mecanica: 'tren', items: 4, aciertosPrimera: 4, duracionMs: 200000 }).estrellas).toBe(2);
  });
  it('carrera: la tercera estrella es ganar al fantasma', () => {
    const base = { mecanica: 'carrera' as const, items: 10, aciertosPrimera: 9, duracionMs: 60000 };
    expect(calcularEstrellas({ ...base, ganaAlFantasma: true }).estrellas).toBe(3);
    expect(calcularEstrellas({ ...base, ganaAlFantasma: false }).estrellas).toBe(2);
  });
  it('puntuación entre 0 y 1', () => {
    expect(calcularEstrellas({ mecanica: 'detective', items: 3, aciertosPrimera: 2, duracionMs: 1 }).puntuacion).toBe(0.667);
    expect(calcularEstrellas({ mecanica: 'detective', items: 0, aciertosPrimera: 0, duracionMs: 1 }).puntuacion).toBe(0);
  });
});

describe('calcularPcpm', () => {
  it('10 palabras correctas en 30 s = 20 PCPM', () => {
    expect(calcularPcpm(10, 30000)).toBe(20);
    expect(calcularPcpm(5, 0)).toBe(0);
  });
});

const intento = (nivelId: string, estrellas: number, extra: Partial<IntentoNivel> = {}): IntentoNivel => ({
  nivelId, mundo: 1, nivel: 0, mecanica: 'intrusa', estrellas, puntuacion: 1, duracionMs: 1000,
  contexto: 'casa', completadoEn: null, ...extra,
});

describe('resumirProgreso', () => {
  const r = resumirProgreso([
    intento('m1-n1', 1),
    intento('m1-n1', 3),
    intento('m1-n1', 2),
    intento('m1-n2', 2, { pegatina: 'sol', pegatinaImg: 7 }),
    intento('m1-n2', 1, { pegatina: 'sol', pegatinaImg: 7 }),
    intento('m1-n8', 2, { mecanica: 'carrera', pcpm: 12, duracionMs: 50000 }),
    intento('m1-n8', 1, { mecanica: 'carrera', pcpm: 18, duracionMs: 33000 }),
    intento('m1-n8', 2, { mecanica: 'carrera', pcpm: 15, duracionMs: 40000 }),
  ]);

  it('se queda con las mejores estrellas de cada nivel', () => {
    expect(r.mejores.get('m1-n1')?.estrellas).toBe(3);
    expect(r.totalEstrellas).toBe(3 + 2 + 2);
  });
  it('pegatinas sin repetir', () => {
    expect(r.pegatinas).toEqual([{ palabra: 'sol', img: 7 }]);
  });
  it('el fantasma es la mejor marca de PCPM con su duración', () => {
    expect(r.mejores.get('m1-n8')).toEqual({ estrellas: 2, pcpm: 18, duracionMs: 33000 });
  });
  it('estrellas por mundo y desbloqueo de niveles', () => {
    const ids = ['m1-n1', 'm1-n2', 'm1-n3', 'm1-n4'];
    expect(estrellasDeMundo(r, ids)).toEqual({ conseguidas: 5, posibles: 12 });
    expect(nivelDesbloqueado(r, ids, 0)).toBe(true);
    expect(nivelDesbloqueado(r, ids, 2)).toBe(true);
    expect(nivelDesbloqueado(r, ids, 3)).toBe(false);
  });
});
