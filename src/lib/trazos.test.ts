import { describe, expect, it } from 'vitest';
import { evaluarTrazo, LETRAS, longitud, remuestrear, toleranciaDe, type Punto } from './trazos.ts';

const temblor = (t: Punto[], amplitud: number): Punto[] =>
  t.map((p, i) => ({ x: p.x + Math.sin(i * 1.7) * amplitud, y: p.y + Math.cos(i * 1.3) * amplitud }));

describe('modelos de letras', () => {
  it('están todas las letras que se enseñan en los mundos', () => {
    for (const l of 'abcdefghijklmnñopqrstuvxyz') expect(LETRAS[l]?.length).toBeGreaterThan(0);
  });
  it('los redondos de la a, o, c empiezan arriba a la derecha', () => {
    for (const l of ['a', 'o', 'c', 'd', 'g', 'q']) {
      const inicio = LETRAS[l]![0]![0]!;
      expect(inicio.x).toBeGreaterThan(30);
      expect(inicio.y).toBeLessThan(60);
    }
  });
  it('la l y la t se escriben de arriba abajo', () => {
    for (const l of ['l', 't']) {
      const trazo = LETRAS[l]![0]!;
      expect(trazo[0]!.y).toBeLessThan(trazo[trazo.length - 1]!.y);
    }
  });
});

describe('remuestrear', () => {
  it('reparte puntos a lo largo del recorrido', () => {
    const r = remuestrear([{ x: 0, y: 0 }, { x: 100, y: 0 }], 5);
    expect(r.map((p) => Math.round(p.x))).toEqual([0, 25, 50, 75, 100]);
    expect(Math.round(longitud(r))).toBe(100);
  });
});

describe('evaluarTrazo', () => {
  const tol = toleranciaDe(3);

  it('el trazo modelo, con un poco de temblor, está bien', () => {
    for (const l of 'abcdeilmnoprstu') {
      for (const trazo of LETRAS[l]!) {
        if (trazo.length > 1) expect(evaluarTrazo(trazo, temblor(trazo, 4), tol)).toBe('bien');
      }
    }
  });

  it('detecta la dirección al revés (de abajo arriba en la l)', () => {
    const l = LETRAS.l![0]!;
    expect(evaluarTrazo(l, [...l].reverse(), tol)).toBe('al-reves');
  });

  it('detecta la o girada al revés (en el sentido del reloj)', () => {
    const o = LETRAS.o![0]!;
    // Mismo punto de inicio, pero girando hacia la derecha.
    const alReves = [o[0]!, ...[...o].slice(1).reverse()];
    expect(evaluarTrazo(o, alReves, tol)).not.toBe('bien');
  });

  it('una raya que no tiene nada que ver es "forma"', () => {
    expect(evaluarTrazo(LETRAS.c![0]!, [{ x: 0, y: 40 }, { x: 60, y: 120 }], tol)).toBe('forma');
  });

  it('a medias es "corto"', () => {
    const l = LETRAS.l![0]!;
    expect(evaluarTrazo(l, l.slice(0, 10), tol)).toBe('corto');
  });

  it('el punto de la i: tocar cerca', () => {
    const punto = LETRAS.i![1]!;
    expect(evaluarTrazo(punto, [{ x: 22, y: 26 }], tol)).toBe('bien');
    expect(evaluarTrazo(punto, [{ x: 60, y: 90 }], tol)).toBe('forma');
  });

  it('el escalón 1 perdona más que el 5', () => {
    expect(toleranciaDe(1)).toBeGreaterThan(toleranciaDe(5));
  });
});
