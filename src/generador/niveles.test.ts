import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../lib/aleatorio.ts';
import { mundoDePalabra, mundoDeFrase } from '../lib/clasificador.ts';
import { esRespuestaCorrecta } from '../lib/intrusas.ts';
import { silabear } from '../lib/silabas.ts';
import { generarFrases, generarMundo, type PalabraMundo } from './niveles.ts';

const crear = (lista: string[]): PalabraMundo[] =>
  lista.map((texto, i) => ({ texto, silabas: silabear(texto), img: 1000 + i }));

const MUNDO_1 = crear([
  'mamá', 'mesa', 'sopa', 'pala', 'oso', 'pelo', 'pila', 'lupa', 'mapa', 'suma',
  'paloma', 'puma', 'peso', 'sapo', 'lima', 'mula', 'ola', 'ala', 'pipa', 'mimo',
  'loma', 'masa', 'pomo', 'pupa', 'mopa', 'seta', 'osa',
].filter((p) => mundoDePalabra(p) === 1));

const MUNDO_4 = crear([
  'sol', 'pastel', 'árbol', 'falda', 'pasta', 'cesto', 'tarta', 'sartén', 'campo', 'bolsa',
  'carta', 'mosca', 'perla', 'pulpo', 'lápiz', 'barco', 'disco', 'muñeco',
].filter((p) => mundoDePalabra(p) === 4));

const DICCIONARIO = new Set([
  ...MUNDO_1.map((p) => p.texto), ...MUNDO_4.map((p) => p.texto),
  'plato', 'pato', 'palo', 'pasto', 'mesas', 'sopla', 'pelos', 'lupas', 'salsa', 'bolso',
]);

describe('generarMundo (Mundo 1)', () => {
  const r = generarMundo(1, MUNDO_1, DICCIONARIO);

  it('genera 8 niveles sin avisos', () => {
    expect(r.avisos).toEqual([]);
    expect(r.niveles).toHaveLength(8);
    expect(r.niveles.map((n) => n.mecanica)).toEqual([
      'intrusa', 'burbujas', 'tren', 'detective', 'intrusa', 'burbujas', 'tren', 'carrera',
    ]);
  });

  it('es determinista: misma semilla, mismos niveles', () => {
    expect(JSON.stringify(generarMundo(1, MUNDO_1, DICCIONARIO))).toBe(JSON.stringify(r));
  });

  it('las intrusas deletrean la palabra secreta y se pueden resolver', () => {
    for (const n of r.niveles) {
      if (n.mecanica !== 'intrusa') continue;
      expect(n.items.map((i) => i.letra).join('')).toBe(n.secreta);
      expect(MUNDO_1.some((p) => p.texto === n.secreta)).toBe(true);
      for (const item of n.items) {
        expect(esRespuestaCorrecta(item.conIntrusa, item.posicion, item.palabra)).toBe(true);
      }
    }
  });

  it('las burbujas tienen objetivo, pista y al menos 2 distractores distintos del objetivo', () => {
    for (const n of r.niveles) {
      if (n.mecanica !== 'burbujas') continue;
      expect(n.distractores.length).toBeGreaterThan(1);
      expect(n.distractores.map((d) => d.texto)).not.toContain(n.objetivo);
    }
  });

  it('los trenes piden sílabas de palabras del mundo y la trampa no es una pieza', () => {
    for (const n of r.niveles) {
      if (n.mecanica !== 'tren') continue;
      for (const item of n.items) {
        expect(item.piezas.join('')).toBe(item.lectura);
        expect(item.piezas).not.toContain(item.trampas[0]?.texto);
      }
    }
  });

  it('el detective usa frases del Mundo 1 con 2 dibujos y la correcta bien marcada', () => {
    const det = r.niveles.find((n) => n.mecanica === 'detective');
    if (det?.mecanica !== 'detective') throw new Error('falta el detective');
    for (const item of det.items) {
      expect(item.escenas).toHaveLength(2);
      expect(mundoDeFrase(item.frase.split(' '))).toBe(1);
      const nombre = item.frase.split(' ')[1];
      expect(item.escenas[item.correcta]?.elementos[0]?.palabra).toBe(nombre);
    }
  });

  it('la carrera usa las 10 palabras más frecuentes', () => {
    const c = r.niveles.find((n) => n.mecanica === 'carrera');
    if (c?.mecanica !== 'carrera') throw new Error('falta la carrera');
    expect(c.palabras).toEqual(MUNDO_1.slice(0, 10).map((p) => p.texto));
  });
});

describe('generarMundo (Mundo 4)', () => {
  const r = generarMundo(4, MUNDO_4, DICCIONARIO);

  it('genera niveles y frases de tamaño/cantidad del Mundo 4', () => {
    expect(r.niveles.length).toBeGreaterThan(5);
    expect(r.frases.length).toBeGreaterThan(0);
    for (const f of r.frases) expect(f.mundo).toBe(4);
    expect(r.frases.some((f) => f.plantilla === 'tamano' || f.plantilla === 'cantidad')).toBe(true);
  });

  it('las burbujas del Mundo 4 pescan sílabas inversas o mixtas', () => {
    const b = r.niveles.find((n) => n.mecanica === 'burbujas' && !n.esFrase);
    if (b?.mecanica !== 'burbujas') throw new Error('faltan burbujas');
    expect(['VC', 'CVC']).toContain(b.patron);
  });
});

describe('generarFrases', () => {
  it('no hay frases repetidas y todas son del mundo pedido', () => {
    const frases = generarFrases(1, MUNDO_1, crearAleatorio(1));
    const textos = frases.map((f) => f.texto);
    expect(new Set(textos).size).toBe(textos.length);
    for (const f of frases) expect(f.mundo).toBe(1);
  });
});

describe('crearAleatorio', () => {
  it('misma semilla, misma secuencia; barajar no pierde elementos', () => {
    const a = crearAleatorio(42);
    const b = crearAleatorio(42);
    expect([a.siguiente(), a.siguiente()]).toEqual([b.siguiente(), b.siguiente()]);
    expect(crearAleatorio(7).barajar([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(crearAleatorio(7).elegir([])).toBe(undefined);
  });
});
