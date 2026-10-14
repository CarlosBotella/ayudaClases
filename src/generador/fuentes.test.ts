import { describe, expect, it } from 'vitest';
import { ContenidoZ, SCHEMA_VERSION } from '../datos/esquemas.ts';
import { silabear } from '../lib/silabas.ts';
import { construirCandidatas, resumenPorMundo } from './candidatas.ts';
import { indexarPictogramas, parsearFrecuencias } from './fuentes.ts';
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
    { _id: 10, keywords: [{ keyword: 'Pato', type: 2 }] },
    { _id: 5, keywords: [{ keyword: 'ave', type: 2 }, { keyword: 'pato', type: 2 }] },
    { _id: 20, sex: true, keywords: [{ keyword: 'mesa', type: 2 }] },
    { _id: 21, keywords: [{ keyword: 'mesa', type: 2 }] },
    { _id: 30, keywords: [{ keyword: 'comer', type: 3 }] },
    { _id: 40, keywords: [{ keyword: 'sol', type: 1 }] },
    { _id: 41, violence: true, keywords: [{ keyword: 'oso', type: 2 }] },
    { basura: true },
  ];
  const indice = indexarPictogramas(datos);

  it('prefiere el pictograma donde la palabra es la primera clave', () => {
    expect(indice.get('pato')).toEqual({ id: 10, comun: true });
  });
  it('descarta sexuales y violentos', () => {
    expect(indice.get('mesa')?.id).toBe(21);
    expect(indice.has('oso')).toBe(false);
  });
  it('solo nombres (comunes o propios), no verbos', () => {
    expect(indice.has('comer')).toBe(false);
    expect(indice.get('sol')).toEqual({ id: 40, comun: false });
  });
  it('no se rompe con datos raros', () => {
    expect(indexarPictogramas(null).size).toBe(0);
  });
});

describe('construirCandidatas', () => {
  it('filtra por letras, longitud, pictograma y mundo', () => {
    const frec = parsearFrecuencias('mesa 9\npato 8\nmurciélago 7\nwifi 6\ninstante 5\nsol 4\nperro 3');
    const pictos = indexarPictogramas([
      { _id: 1, keywords: [{ keyword: 'mesa', type: 2 }] },
      { _id: 2, keywords: [{ keyword: 'pato', type: 2 }] },
      { _id: 3, keywords: [{ keyword: 'murciélago', type: 2 }] },
      { _id: 4, keywords: [{ keyword: 'wifi', type: 2 }] },
      { _id: 5, keywords: [{ keyword: 'instante', type: 2 }] },
      { _id: 6, keywords: [{ keyword: 'sol', type: 1 }] },
    ]);
    const c = construirCandidatas(frec, pictos);
    expect(c.map((x) => `${x.texto}:${x.mundo}`)).toEqual(['mesa:1', 'pato:2', 'sol:4']);
    expect(resumenPorMundo(c)).toEqual({
      1: { comunes: 1, total: 1 },
      2: { comunes: 1, total: 1 },
      4: { comunes: 0, total: 1 },
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
