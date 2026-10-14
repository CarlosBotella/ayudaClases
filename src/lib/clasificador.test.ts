import { describe, expect, it } from 'vitest';
import { grafemasDe, mundoDeFrase, mundoDePalabra, permitidosEnMundo } from './clasificador.ts';

describe('mundoDePalabra', () => {
  const casos: Array<[string, number | null]> = [
    // Mundo 1: vocales + m p l s, sílabas V y CV
    ['mamá', 1],
    ['mesa', 1],
    ['oso', 1],
    ['pala', 1],
    ['sopa', 1],
    // Mundo 2: + t d n f b v ñ
    ['pato', 2],
    ['dedo', 2],
    ['niño', 2],
    ['foto', 2],
    // Mundo 3: + c qu g gu gü r rr h y z j ch ll x k
    ['casa', 3],
    ['queso', 3],
    ['perro', 3],
    ['coche', 3],
    ['gato', 3],
    ['jirafa', 3],
    ['ahora', 3],
    ['guiso', 3],
    ['y', 3],
    // Mundo 4: + VC y CVC
    ['sol', 4],
    ['árbol', 4],
    ['pastel', 4],
    ['es', 4],
    ['el', 4],
    // Mundo 5: + CCV y CCVC
    ['plato', 5],
    ['bruja', 5],
    ['tren', 5],
    ['libro', 5],
    // Fuera de todos los mundos
    ['instante', null], // ins = VCC
    ['obstruir', null],
    ['transporte', null],
    ['wifi', null], // w no se enseña
    ['pst', null],
  ];

  it.each(casos)('%s → mundo %s', (palabra, mundo) => {
    expect(mundoDePalabra(palabra)).toBe(mundo);
  });
});

describe('mundoDeFrase', () => {
  it('es el máximo de sus palabras', () => {
    expect(mundoDeFrase(['la', 'mesa'])).toBe(1);
    expect(mundoDeFrase(['pato', 'y', 'mesa'])).toBe(3);
    expect(mundoDeFrase(['el', 'pato', 'es', 'grande'])).toBe(5);
  });

  it('se descarta si alguna palabra no encaja', () => {
    expect(mundoDeFrase(['el', 'instante'])).toBeNull();
  });

  it('una frase vacía no tiene mundo', () => {
    expect(mundoDeFrase([])).toBeNull();
  });
});

describe('grafemasDe', () => {
  it('cuenta los dígrafos como una unidad y quita tildes', () => {
    expect(grafemasDe('coche')).toEqual(['c', 'o', 'ch', 'e']);
    expect(grafemasDe('pingüino')).toEqual(['p', 'i', 'n', 'gü', 'i', 'n', 'o']);
    expect(grafemasDe('mamá')).toEqual(['m', 'a', 'm', 'a']);
  });
});

describe('permitidosEnMundo', () => {
  it('acumula letras y patrones de los mundos anteriores', () => {
    const m4 = permitidosEnMundo(4);
    expect(m4.grafemas.has('m')).toBe(true);
    expect(m4.grafemas.has('ch')).toBe(true);
    expect(m4.patrones.has('CVC')).toBe(true);
    expect(m4.patrones.has('CCV')).toBe(false);
  });
});
