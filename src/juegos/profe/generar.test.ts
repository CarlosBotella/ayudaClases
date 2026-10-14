import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../../lib/aleatorio.ts';
import { silabear } from '../../lib/silabas.ts';
import { generarDictado, generarParejas, generarPillado, grafemasParaDictado } from './generar.ts';

const palabras = ['mesa', 'sopa', 'pala', 'oso', 'pelo', 'pila', 'lupa', 'mapa', 'paloma', 'sapo', 'dedo', 'queso', 'plato']
  .map((texto, i) => ({ texto, silabas: silabear(texto), img: 10 + i }));

describe('¡Pillado!', () => {
  const rondas = generarPillado(palabras, crearAleatorio(3), 8);

  it('8 rondas, la mitad con error', () => {
    expect(rondas).toHaveLength(8);
    expect(rondas.filter((r) => r.esError).length).toBe(4);
  });

  it('si hay error, el profe lee algo distinto de lo escrito y se sabe qué error es', () => {
    for (const r of rondas) {
      if (r.esError) {
        expect(r.leer).not.toBe(r.palabra);
        expect(r.tipo).not.toBe(null);
      } else {
        expect(r.leer).toBe(r.palabra);
      }
    }
  });
});

describe('Dictado mágico', () => {
  it('separa la palabra en fichas, con los dígrafos juntos', () => {
    expect(grafemasParaDictado('plato')).toEqual(['p', 'l', 'a', 't', 'o']);
    expect(grafemasParaDictado('queso')).toEqual(['qu', 'e', 's', 'o']);
    expect(grafemasParaDictado('coche')).toEqual(['c', 'o', 'ch', 'e']);
  });

  it('cada ronda tiene trampas que no están en la palabra', () => {
    const rondas = generarDictado(palabras, 2, crearAleatorio(5), 5);
    expect(rondas).toHaveLength(5);
    for (const r of rondas) {
      expect(r.grafemas.join('')).toBe(r.palabra);
      expect(r.trampas.length).toBeGreaterThan(0);
      for (const t of r.trampas) expect(r.grafemas).not.toContain(t.texto);
    }
  });

  it('dedo lleva la trampa en espejo b', () => {
    const r = generarDictado([palabras.find((p) => p.texto === 'dedo')!], 2, crearAleatorio(1), 1)[0];
    expect(r?.trampas).toContainEqual({ texto: 'b', tipo: 'espejo' });
  });
});

describe('Parejas', () => {
  it('6 parejas = 12 cartas, cada palabra con su texto y su dibujo', () => {
    const cartas = generarParejas(palabras, crearAleatorio(9), 6);
    expect(cartas).toHaveLength(12);
    const porPalabra = new Map<string, string[]>();
    for (const c of cartas) porPalabra.set(c.palabra, [...(porPalabra.get(c.palabra) ?? []), c.cara]);
    for (const caras of porPalabra.values()) expect(caras.sort()).toEqual(['dibujo', 'palabra']);
  });
});
