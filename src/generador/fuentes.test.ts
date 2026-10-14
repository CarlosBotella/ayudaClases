import { describe, expect, it } from 'vitest';
import { ContenidoZ, SCHEMA_VERSION } from '../datos/esquemas.ts';
import { silabear } from '../lib/silabas.ts';
import { construirCandidatas, resumenPorMundo } from './candidatas.ts';
import { clasificarTemas, indexarPictogramas, parsearFrecuencias } from './fuentes.ts';
import { generarMundo } from './niveles.ts';

describe('parsearFrecuencias', () => {
  it('lee "palabra frecuencia", en minúscula y por orden', () => {
    const r = parsearFrecuencias('de 100\nQue 90\nmesa 5\nde 1\n\n', 10);
    expect([...r]).toEqual([
      ['de', 1],
      ['que', 2],
      ['mesa', 3],
    ]);
  });

  it('respeta el máximo', () => {
    expect(parsearFrecuencias('a 1\nb 1\nc 1', 2).size).toBe(2);
  });
});

describe('indexarPictogramas', () => {
  const datos = [
    { _id: 10, tags: ['animal'], keywords: [{ keyword: 'Pato', type: 2 }] },
    { _id: 5, keywords: [{ keyword: 'ave', type: 2 }, { keyword: 'pato', type: 2 }] },
    { _id: 20, sex: true, keywords: [{ keyword: 'mesa', type: 2 }] },
    { _id: 21, keywords: [{ keyword: 'mesa', type: 2 }] },
    { _id: 30, keywords: [{ keyword: 'comer', type: 3 }] },
    { _id: 40, keywords: [{ keyword: 'sol', type: 1 }] },
    { _id: 41, violence: true, keywords: [{ keyword: 'oso', type: 2 }] },
    { _id: 50, tags: ['health', 'addiction', 'drugs'], keywords: [{ keyword: 'droga', type: 2 }] },
    { _id: 60, tags: ['time', 'unit of time'], keywords: [{ keyword: 'vez', type: 2 }] },
    { basura: true },
  ];
  const indice = indexarPictogramas(datos);

  it('prefiere el pictograma donde la palabra es la primera clave', () => {
    expect(indice.get('pato')).toEqual({ id: 10, comun: true, concreta: true });
  });
  it('descarta sexuales, violentos y temas bloqueados', () => {
    expect(indice.get('mesa')?.id).toBe(21);
    expect(indice.has('oso')).toBe(false);
    expect(indice.has('droga')).toBe(false);
  });
  it('las ideas abstractas no son concretas', () => {
    expect(indice.get('vez')?.concreta).toBe(false);
  });
  it('solo nombres (comunes o propios), no verbos', () => {
    expect(indice.has('comer')).toBe(false);
    expect(indice.get('sol')).toEqual({ id: 40, comun: false, concreta: false });
  });
  it('no se rompe con datos raros', () => {
    expect(indexarPictogramas(null).size).toBe(0);
  });
});

describe('clasificarTemas', () => {
  it('reconoce lo bloqueado, lo concreto y lo abstracto', () => {
    expect(clasificarTemas(['object', 'furniture'])).toEqual({ bloqueada: false, concreta: true });
    expect(clasificarTemas(['event', 'war'])).toEqual({ bloqueada: true, concreta: false });
    expect(clasificarTemas(['religion', 'christianity'])).toEqual({ bloqueada: true, concreta: false });
    expect(clasificarTemas(['software', 'award'])).toEqual({ bloqueada: false, concreta: false });
    expect(clasificarTemas(['psychology', 'feeling'])).toEqual({ bloqueada: false, concreta: false });
  });
});

describe('construirCandidatas', () => {
  it('filtra por letras, longitud, pictograma, plurales y mundo', () => {
    const frec = parsearFrecuencias('mesa 9\npato 8\nmurciélago 7\nwifi 6\ninstante 5\nsol 4\nperro 3\nmesas 2\nla 1');
    const pictos = indexarPictogramas([
      { _id: 1, tags: ['furniture'], keywords: [{ keyword: 'mesa', type: 2 }, { keyword: 'mesas', type: 2 }] },
      { _id: 7, keywords: [{ keyword: 'la', type: 1 }] },
      { _id: 2, keywords: [{ keyword: 'pato', type: 2 }] },
      { _id: 3, keywords: [{ keyword: 'murciélago', type: 2 }] },
      { _id: 4, keywords: [{ keyword: 'wifi', type: 2 }] },
      { _id: 5, keywords: [{ keyword: 'instante', type: 2 }] },
      { _id: 6, keywords: [{ keyword: 'sol', type: 1 }] },
    ]);
    const c = construirCandidatas(frec, pictos);
    expect(c.map((x) => `${x.texto}:${x.mundo}`)).toEqual(['mesa:1', 'pato:2', 'sol:4']);
    expect(c[0]?.concreta).toBe(true);
    expect(resumenPorMundo(c)).toEqual({
      1: { concretas: 1, comunes: 1, total: 1 },
      2: { concretas: 0, comunes: 1, total: 1 },
      4: { concretas: 0, comunes: 0, total: 1 },
    });
  });
});

describe('documento contenido/mundo-N', () => {
  it('lo que genera el motor pasa la validación de Zod', () => {
    const palabras = ['mamá', 'mesa', 'sopa', 'pala', 'oso', 'pelo', 'pila', 'lupa', 'mapa', 'suma', 'paloma', 'sapo', 'lima', 'mula', 'ola']
      .map((texto, i) => ({ texto, silabas: silabear(texto), img: 100 + i }));
    const r = generarMundo(1, palabras, new Set(palabras.map((p) => p.texto)));
    const documento = {
      schemaVersion: SCHEMA_VERSION,
      mundo: 1,
      palabras: Object.fromEntries(palabras.map((p) => [p.texto, { silabas: p.silabas, img: p.img }])),
      niveles: r.niveles,
      frases: r.frases,
      actualizado: new Date(),
    };
    const resultado = ContenidoZ.safeParse(documento);
    if (!resultado.success) console.error(resultado.error.issues);
    expect(resultado.success).toBe(true);
    expect(JSON.stringify(documento).length).toBeLessThan(1_000_000);
  });
});
