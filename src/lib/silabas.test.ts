import { describe, expect, it } from 'vitest';
import { analizarSilabas, patronDe, silabaTonica, silabear, tokenizar } from './silabas.ts';

describe('silabear: casos obligatorios', () => {
  const casos: Array<[string, string]> = [
    ['casa', 'ca·sa'],
    ['plato', 'pla·to'],
    ['bruja', 'bru·ja'],
    ['árbol', 'ár·bol'],
    ['hablar', 'ha·blar'],
    ['hombre', 'hom·bre'],
    ['instante', 'ins·tan·te'],
    ['obstruir', 'obs·truir'],
    ['queso', 'que·so'],
    ['guiso', 'gui·so'],
    ['pingüino', 'pin·güi·no'],
    ['perro', 'pe·rro'],
    ['calle', 'ca·lle'],
    ['aire', 'ai·re'],
    ['día', 'dí·a'],
    ['país', 'pa·ís'],
    ['leer', 'le·er'],
    ['ahora', 'a·ho·ra'],
    ['ciudad', 'ciu·dad'],
  ];

  it.each(casos)('%s → %s', (palabra, esperado) => {
    expect(silabear(palabra).join('·')).toBe(esperado);
  });
});

describe('silabear: más casos', () => {
  const casos: Array<[string, string]> = [
    ['pato', 'pa·to'],
    ['mesa', 'me·sa'],
    ['sol', 'sol'],
    ['oso', 'o·so'],
    ['agua', 'a·gua'],
    ['coche', 'co·che'],
    ['rey', 'rey'],
    ['reyes', 're·yes'],
    ['yoyó', 'yo·yó'],
    ['hoy', 'hoy'],
    ['río', 'rí·o'],
    ['poeta', 'po·e·ta'],
    ['cigüeña', 'ci·güe·ña'],
    ['guerra', 'gue·rra'],
    ['blusa', 'blu·sa'],
    ['tren', 'tren'],
    ['libro', 'li·bro'],
    ['cuatro', 'cua·tro'],
    ['transporte', 'trans·por·te'],
    ['Mamá', 'ma·má'],
  ];

  it.each(casos)('%s → %s', (palabra, esperado) => {
    expect(silabear(palabra).join('·')).toBe(esperado);
  });

  it('una palabra sin vocales no se puede silabear', () => {
    expect(silabear('pst')).toEqual([]);
  });
});

describe('patrones de sílaba', () => {
  const casos: Array<[string, string]> = [
    ['pla', 'CCV'],
    ['sol', 'CVC'],
    ['al', 'VC'],
    ['que', 'CV'],
    ['gui', 'CV'],
    ['güi', 'CV'],
    ['cha', 'CV'],
    ['rro', 'CV'],
    ['a', 'V'],
    ['ai', 'V'],
    ['ciu', 'CV'],
    ['truir', 'CCVC'],
    ['ins', 'VCC'],
  ];

  it.each(casos)('%s = %s', (silaba, patron) => {
    expect(patronDe(silaba)).toBe(patron);
  });

  it('analizarSilabas devuelve el patrón de cada sílaba', () => {
    expect(analizarSilabas('plato').map((s) => s.patron)).toEqual(['CCV', 'CV']);
    expect(analizarSilabas('árbol').map((s) => s.patron)).toEqual(['VC', 'CVC']);
  });
});

describe('tokenizar', () => {
  it('trata los dígrafos como una sola consonante', () => {
    expect(tokenizar('chillar').map((t) => t.texto)).toEqual(['ch', 'i', 'll', 'a', 'r']);
    expect(tokenizar('queso').map((t) => t.texto)).toEqual(['qu', 'e', 's', 'o']);
  });

  it('la "y" es consonante ante vocal y vocal en el resto', () => {
    expect(tokenizar('yo')[0]?.tipo).toBe('C');
    expect(tokenizar('rey')[2]?.tipo).toBe('V');
    expect(tokenizar('y')[0]?.tipo).toBe('V');
  });
});

describe('silabaTonica', () => {
  const casos: Array<[string, number]> = [
    ['casa', 0],
    ['papel', 1],
    ['árbol', 0],
    ['camión', 1],
    ['día', 0],
    ['sol', 0],
    ['ahora', 1],
    ['agua', 0],
  ];

  it.each(casos)('%s → sílaba %i', (palabra, indice) => {
    expect(silabaTonica(palabra)).toBe(indice);
  });
});
