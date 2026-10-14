import { describe, expect, it } from 'vitest';
import type { Contenido } from '../datos/esquemas.ts';
import { crearAleatorio } from '../lib/aleatorio.ts';
import { silabear } from '../lib/silabas.ts';
import { conRepaso, crearNivelRepaso, esRepaso } from './repaso.ts';

const contenido = (mundo: number, palabras: string[]): Contenido => ({
  schemaVersion: 1,
  mundo,
  palabras: Object.fromEntries(palabras.map((t, i) => [t, { silabas: silabear(t), img: i + 1 }])),
  niveles: [{ id: `m${mundo}-n1`, titulo: '', dificultad: 1, mecanica: 'carrera', palabras: palabras.slice(0, 3) }],
  frases: [],
  actualizado: null,
});

const mundos = [contenido(1, ['mesa', 'sopa', 'pala', 'oso']), contenido(5, ['plato', 'blusa', 'libro', 'tabla'])];

describe('crearNivelRepaso', () => {
  it('hace un tren con palabras que contienen las sílabas flojas', () => {
    const plan = crearNivelRepaso(['bla', 'pla'], mundos, crearAleatorio(1), 123);
    expect(plan?.mundo).toBe(5);
    expect(plan?.unidades).toEqual(['bla', 'pla']);
    expect(plan?.nivel.id).toBe('m5-repaso-123');
    if (plan?.nivel.mecanica !== 'tren') throw new Error('debería ser un tren');
    for (const item of plan.nivel.items) {
      expect(item.piezas.some((s) => s === 'bla' || s === 'pla')).toBe(true);
      expect(item.piezas).not.toContain(item.trampas[0]?.texto);
    }
  });

  it('si no hay sílaba exacta, busca el grafema', () => {
    const plan = crearNivelRepaso(['b'], mundos, crearAleatorio(2));
    expect(plan?.unidades).toEqual(['b']);
  });

  it('null si ninguna palabra sirve', () => {
    expect(crearNivelRepaso(['xxx'], mundos, crearAleatorio(3))).toBeNull();
  });

  it('el repaso nuevo sustituye al anterior', () => {
    const plan = crearNivelRepaso(['so'], mundos, crearAleatorio(4), 1)!;
    const conUno = { ...mundos[0]!, niveles: conRepaso(mundos[0]!, plan.nivel) };
    const plan2 = crearNivelRepaso(['pa'], mundos, crearAleatorio(5), 2)!;
    const niveles = conRepaso(conUno, plan2.nivel);
    expect(niveles.filter((n) => esRepaso(n.id)).map((n) => n.id)).toEqual(['m1-repaso-2']);
    expect(niveles).toHaveLength(2);
  });
});
