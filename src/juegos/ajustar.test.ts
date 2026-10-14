import { describe, expect, it } from 'vitest';
import type { Contenido, NivelBurbujas, NivelDetective, NivelIntrusa, NivelTren } from '../datos/esquemas.ts';
import { esRespuestaCorrecta } from '../lib/intrusas.ts';
import { silabear } from '../lib/silabas.ts';
import { ajustarNivel, parametrosProfe } from './ajustar.ts';

const palabras = ['mesa', 'sopa', 'pala', 'oso', 'pelo', 'pila', 'paloma', 'pelota', 'maleta', 'tomate', 'dedo', 'pato'];
const contenido: Contenido = {
  schemaVersion: 1,
  mundo: 2,
  palabras: Object.fromEntries(palabras.map((t, i) => [t, { silabas: silabear(t), img: i + 1 }])),
  niveles: [],
  frases: [],
  actualizado: null,
};

const burbujas: NivelBurbujas = {
  id: 'm2-n2', titulo: '', dificultad: 1, mecanica: 'burbujas', objetivo: 'pa', patron: 'CV',
  pista: { elementos: [{ palabra: 'pato', escala: 1, copias: 1 }] },
  distractores: [
    { texto: 'qa', tipo: 'espejo' }, { texto: 'ma', tipo: 'sustitucion' },
    { texto: 'ba', tipo: 'sonoridad' }, { texto: 'ap', tipo: 'inversion' },
  ],
  meta: 6, velocidad: 10, maxBurbujas: 5, proporcion: 0.4, esFrase: false,
};

describe('ajustarNivel', () => {
  it('burbujas: más lentas y con trampas visuales abajo; más rápidas y fonológicas arriba', () => {
    const facil = ajustarNivel(burbujas, 1, contenido) as NivelBurbujas;
    const dificil = ajustarNivel(burbujas, 5, contenido) as NivelBurbujas;
    expect(facil.velocidad).toBeGreaterThan(burbujas.velocidad);
    expect(dificil.velocidad).toBeLessThan(burbujas.velocidad);
    expect(facil.maxBurbujas).toBeLessThan(dificil.maxBurbujas);
    expect(facil.proporcion).toBeGreaterThan(dificil.proporcion);
    expect(facil.distractores.map((d) => d.tipo).sort()).toEqual(['espejo', 'sustitucion']);
    expect(dificil.distractores.map((d) => d.tipo).sort()).toEqual(['inversion', 'sonoridad']);
  });

  it('intrusa: misma palabra secreta, siempre resoluble; sin audio en el escalón 5', () => {
    const n: NivelIntrusa = {
      id: 'm2-n1', titulo: '', dificultad: 1, mecanica: 'intrusa', secreta: 'oso', audioAuto: true,
      items: [
        { palabra: 'mesa', conIntrusa: 'omesa', posicion: 0, letra: 'o', dificultad: 'normal' },
        { palabra: 'dedo', conIntrusa: 'sdedo', posicion: 0, letra: 's', dificultad: 'normal' },
        { palabra: 'pato', conIntrusa: 'opato', posicion: 0, letra: 'o', dificultad: 'normal' },
      ],
    };
    for (const e of [1, 2, 3, 4, 5]) {
      const r = ajustarNivel(n, e, contenido) as NivelIntrusa;
      expect(r.items.map((i) => i.letra).join('')).toBe('oso');
      for (const i of r.items) expect(esRespuestaCorrecta(i.conIntrusa, i.posicion, i.palabra)).toBe(true);
      expect(r.audioAuto).toBe(e < 5);
    }
  });

  it('tren: palabras de 2 sílabas abajo, de 3 o más arriba (con 2 trampas)', () => {
    const n: NivelTren = {
      id: 'm2-n3', titulo: '', dificultad: 2, mecanica: 'tren',
      items: [0, 1, 2, 3].map(() => ({
        piezas: ['me', 'sa'], huecos: [0, 1], trampas: [], unidad: 'silaba' as const, lectura: 'mesa',
        escena: { elementos: [{ palabra: 'mesa', escala: 1, copias: 1 }] },
      })),
    };
    const facil = ajustarNivel(n, 1, contenido) as NivelTren;
    const dificil = ajustarNivel(n, 5, contenido) as NivelTren;
    for (const i of facil.items) expect(i.piezas).toHaveLength(2);
    for (const i of dificil.items) {
      expect(i.piezas.length).toBeGreaterThan(2);
      expect(i.trampas.length).toBe(2);
      for (const t of i.trampas) expect(i.piezas).not.toContain(t.texto);
    }
  });

  it('detective: 2 dibujos abajo, 3 arriba, y la correcta sigue marcada', () => {
    const n: NivelDetective = {
      id: 'm2-n4', titulo: '', dificultad: 2, mecanica: 'detective',
      items: [{
        frase: 'la mesa',
        escenas: [{ elementos: [{ palabra: 'mesa', escala: 1, copias: 1 }] }, { elementos: [{ palabra: 'sopa', escala: 1, copias: 1 }] }],
        correcta: 0,
      }],
    };
    for (const [e, cuantas] of [[1, 2], [5, 3]] as const) {
      const r = ajustarNivel(n, e, contenido) as NivelDetective;
      const item = r.items[0]!;
      expect(item.escenas).toHaveLength(cuantas);
      expect(item.escenas[item.correcta]?.elementos[0]?.palabra).toBe('mesa');
    }
  });

  it('es estable: mismo nivel y escalón, mismas rondas', () => {
    expect(JSON.stringify(ajustarNivel(burbujas, 4, contenido))).toBe(JSON.stringify(ajustarNivel(burbujas, 4, contenido)));
  });
});

describe('parametrosProfe', () => {
  it('más parejas y palabras más largas al subir', () => {
    expect(parametrosProfe(1).parejas).toBeLessThan(parametrosProfe(5).parejas);
    expect(parametrosProfe(1).maxGrafemas).toBeLessThan(parametrosProfe(5).maxGrafemas);
    expect(parametrosProfe(5).erroresPillado[0]).toBe('espejo');
  });
});
