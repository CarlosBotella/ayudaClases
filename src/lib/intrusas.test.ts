import { describe, expect, it } from 'vitest';
import { esRespuestaCorrecta, generarIntrusas } from './intrusas.ts';

const DICCIONARIO = new Set(['plato', 'pasto', 'patio', 'pato', 'mesa']);
const CONSONANTES = ['m', 'p', 'l', 's', 't', 'd', 'n', 'f', 'b', 'v', 'r', 'c', 'h'];

describe('generarIntrusas', () => {
  const candidatas = generarIntrusas('pato', CONSONANTES, DICCIONARIO);
  const textos = candidatas.map((c) => c.texto);

  it('encuentra las palabras reales: plato y pasto', () => {
    expect(textos).toContain('plato');
    expect(textos).toContain('pasto');
  });

  it('pone primero las que forman palabra real', () => {
    const primeras = candidatas.slice(0, 2).map((c) => c.texto).sort();
    expect(primeras).toEqual(['pasto', 'plato']);
    expect(candidatas[0]?.dificultad).toBe('palabra-real');
  });

  it('no repite la letra vecina ni crea dígrafos', () => {
    expect(textos).not.toContain('ppato');
    expect(textos).not.toContain('patto');
    // c + h formaría "ch" y cambiaría la lectura: casa ↛ chasa
    const casa = generarIntrusas('casa', CONSONANTES, DICCIONARIO).map((c) => c.texto);
    expect(casa).not.toContain('chasa');
    // r + r formaría "rr": pera ↛ perra
    const pera = generarIntrusas('pera', CONSONANTES, DICCIONARIO).map((c) => c.texto);
    expect(pera).not.toContain('perra');
  });

  it('no inserta dentro de un dígrafo', () => {
    const queso = generarIntrusas('queso', CONSONANTES, DICCIONARIO).map((c) => c.texto);
    expect(queso).not.toContain('qlueso');
    expect(queso.every((t) => t.includes('qu'))).toBe(true);
  });

  it('nunca usa la q', () => {
    expect(generarIntrusas('pato', ['q'], DICCIONARIO)).toEqual([]);
  });

  it('clasifica espejo, normal y muy distinta', () => {
    const dedo = generarIntrusas('dedo', ['b', 'm'], new Set());
    expect(dedo.find((c) => c.letra === 'b')?.dificultad).toBe('espejo');
    const pato = generarIntrusas('pato', ['l', 'm'], new Set());
    expect(pato.find((c) => c.letra === 'l')?.dificultad).toBe('normal');
    expect(pato.find((c) => c.letra === 'm')?.dificultad).toBe('muy-distinta');
  });
});

describe('esRespuestaCorrecta', () => {
  it('plato/pato: tocar la l es correcto', () => {
    expect(esRespuestaCorrecta('plato', 1, 'pato')).toBe(true);
  });

  it('tocar otra letra no es correcto', () => {
    expect(esRespuestaCorrecta('plato', 0, 'pato')).toBe(false);
    expect(esRespuestaCorrecta('plato', 3, 'pato')).toBe(false);
  });

  it('con letras repetidas vale cualquiera de las dos', () => {
    // generarIntrusas no crea dobles, pero si aparecen, ambas valen
    expect(esRespuestaCorrecta('mmesa', 0, 'mesa')).toBe(true);
    expect(esRespuestaCorrecta('mmesa', 1, 'mesa')).toBe(true);
  });

  it('índices fuera de rango no son correctos', () => {
    expect(esRespuestaCorrecta('plato', -1, 'pato')).toBe(false);
    expect(esRespuestaCorrecta('plato', 9, 'pato')).toBe(false);
  });
});
