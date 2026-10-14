import { describe, expect, it } from 'vitest';
import {
  ESCALA_GRANDE,
  ESCALA_PEQUENO,
  frasePareja,
  frasesCantidad,
  frasesTamano,
  generoYArticulo,
  plural,
} from './frases.ts';

describe('generoYArticulo', () => {
  it('-o → el, -a → la', () => {
    expect(generoYArticulo('pato')).toEqual({ genero: 'm', articulo: 'el' });
    expect(generoYArticulo('mesa')).toEqual({ genero: 'f', articulo: 'la' });
  });

  it('descarta otras terminaciones', () => {
    expect(generoYArticulo('sol')).toBeNull();
    expect(generoYArticulo('leche')).toBeNull();
  });

  it('descarta las excepciones conocidas', () => {
    expect(generoYArticulo('mano')).toBeNull(); // la mano
    expect(generoYArticulo('día')).toBeNull(); // el día
    expect(generoYArticulo('mapa')).toBeNull(); // el mapa
  });

  it('descarta femeninas con a tónica inicial (el agua, el hada)', () => {
    expect(generoYArticulo('agua')).toBeNull();
    expect(generoYArticulo('hada')).toBeNull();
    // "abeja" empieza por a pero no es tónica: la abeja
    expect(generoYArticulo('abeja')).toEqual({ genero: 'f', articulo: 'la' });
  });
});

describe('plural', () => {
  it('vocal → +s, consonante → +es, z → ces', () => {
    expect(plural('pato')).toBe('patos');
    expect(plural('mesa')).toBe('mesas');
    expect(plural('sol')).toBe('soles');
    expect(plural('luz')).toBe('luces');
  });
});

describe('frasesTamano', () => {
  it('concuerda pequeño/pequeña y escala el dibujo', () => {
    const [pequeno, grande] = frasesTamano('pato');
    expect(pequeno?.texto).toBe('el pato es pequeño');
    expect(pequeno?.escena.elementos[0]?.escala).toBe(ESCALA_PEQUENO);
    expect(pequeno?.distractoras[0]?.elementos[0]?.escala).toBe(ESCALA_GRANDE);
    expect(grande?.texto).toBe('el pato es grande');

    expect(frasesTamano('mesa')[0]?.texto).toBe('la mesa es pequeña');
  });

  it('tiene como máximo 4 palabras', () => {
    for (const f of frasesTamano('mesa')) expect(f.palabras.length).toBeLessThanOrEqual(4);
  });

  it('añade un objeto distinto como distractora si se pide', () => {
    const [f] = frasesTamano('pato', 'mesa');
    expect(f?.distractoras).toHaveLength(2);
    expect(f?.distractoras[1]?.elementos[0]?.palabra).toBe('mesa');
  });

  it('calcula el mundo de la frase', () => {
    // "es" y "el" son VC (mundo 4); "grande" tiene trabada (mundo 5)
    const [pequeno, grande] = frasesTamano('pato');
    expect(pequeno?.mundo).toBe(4);
    expect(grande?.mundo).toBe(5);
  });

  it('no genera frases con sustantivos sin artículo claro', () => {
    expect(frasesTamano('sol')).toEqual([]);
  });
});

describe('frasesCantidad', () => {
  it('dos/tres + plural, con copias del pictograma', () => {
    const [dos, tres] = frasesCantidad('pato');
    expect(dos?.texto).toBe('dos patos');
    expect(dos?.escena.elementos[0]?.copias).toBe(2);
    expect(dos?.distractoras.map((e) => e.elementos[0]?.copias)).toEqual([3, 1]);
    expect(tres?.texto).toBe('tres patos');
    expect(tres?.escena.elementos[0]?.copias).toBe(3);
  });
});

describe('frasePareja', () => {
  it('pato y mesa; las distractoras cambian una palabra', () => {
    const f = frasePareja('pato', 'mesa', 'sopa');
    expect(f?.texto).toBe('pato y mesa');
    expect(f?.mundo).toBe(3); // "y" es del mundo 3
    expect(f?.distractoras.map((e) => e.elementos.map((x) => x.palabra))).toEqual([
      ['sopa', 'mesa'],
      ['pato', 'sopa'],
    ]);
  });

  it('rechaza palabras repetidas', () => {
    expect(frasePareja('pato', 'pato', 'mesa')).toBeNull();
  });
});
