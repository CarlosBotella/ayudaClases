import { describe, expect, it } from 'vitest';
import {
  aReforzar,
  claveSemana,
  comparativaContextos,
  distribucionErrores,
  estadoUnidades,
  evolucionSemanal,
  mapaDeCalor,
  mediana,
  unidadesDe,
  type Respuesta,
  type ResultadoNivel,
} from './metricas.ts';

const dia = (d: number, h = 17) => new Date(2026, 9, d, h, 0, 0); // octubre 2026

const resp = (p: Partial<Respuesta>): Respuesta => ({
  mecanica: 'burbujas',
  item: 'bla',
  unidadObjetivo: 'bla',
  patron: 'CCV',
  correcto: true,
  errorTipo: null,
  latenciaMs: 1000,
  contexto: 'casa',
  fecha: dia(12),
  ...p,
});

describe('fechas y mediana', () => {
  it('la semana empieza en lunes', () => {
    expect(claveSemana(new Date(2026, 9, 14))).toBe('2026-10-12'); // miércoles → lunes 12
    expect(claveSemana(new Date(2026, 9, 18))).toBe('2026-10-12'); // domingo → lunes 12
    expect(claveSemana(new Date(2026, 9, 19))).toBe('2026-10-19');
  });
  it('mediana', () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([])).toBe(0);
  });
});

describe('unidadesDe', () => {
  it('burbujas: la sílaba objetivo', () => {
    expect(unidadesDe(resp({}))).toEqual({ silabas: ['bla'], grafemas: ['b', 'l', 'a'] });
  });
  it('carrera: todas las sílabas de la palabra', () => {
    expect(unidadesDe(resp({ mecanica: 'carrera', unidadObjetivo: 'plato' })).silabas).toEqual(['pla', 'to']);
  });
  it('dictado: el grafema', () => {
    expect(unidadesDe(resp({ mecanica: 'dictado', unidadObjetivo: 'qu', patron: 'grafema' }))).toEqual({ silabas: [], grafemas: ['qu'] });
  });
  it('detective e intrusa no cuentan', () => {
    expect(unidadesDe(resp({ mecanica: 'detective' }))).toEqual({ silabas: [], grafemas: [] });
  });
});

describe('mapaDeCalor', () => {
  it('% de acierto y latencia mediana por sílaba', () => {
    const celdas = mapaDeCalor(
      [
        resp({ correcto: true, latenciaMs: 1000 }),
        resp({ correcto: false, latenciaMs: 3000 }),
        resp({ correcto: true, latenciaMs: 2000 }),
        resp({ unidadObjetivo: 'pa', patron: 'CV' }),
      ],
      'silaba',
    );
    expect(celdas).toEqual([
      { unidad: 'bla', intentos: 3, aciertos: 2, porcentaje: 67, latenciaMedianaMs: 2000 },
      { unidad: 'pa', intentos: 1, aciertos: 1, porcentaje: 100, latenciaMedianaMs: 1000 },
    ]);
  });
});

describe('dominio', () => {
  it('dominada: ≥90 % en los últimos 10 y en 2 días distintos', () => {
    const lista = Array.from({ length: 10 }, (_, i) => resp({ fecha: dia(i < 5 ? 12 : 13, 10 + i) }));
    const [e] = estadoUnidades(lista, 'silaba');
    expect(e?.dominada).toBe(true);
  });
  it('no dominada si todo fue el mismo día', () => {
    const lista = Array.from({ length: 10 }, (_, i) => resp({ fecha: dia(12, 8 + i) }));
    expect(estadoUnidades(lista, 'silaba')[0]?.dominada).toBe(false);
  });
  it('no dominada con menos de 10 intentos', () => {
    const lista = Array.from({ length: 9 }, (_, i) => resp({ fecha: dia(10 + i) }));
    expect(estadoUnidades(lista, 'silaba')[0]?.dominada).toBe(false);
  });
  it('cuentan solo los 10 últimos: si mejora, se domina', () => {
    const antiguos = Array.from({ length: 5 }, (_, i) => resp({ correcto: false, fecha: dia(1, 8 + i) }));
    const recientes = Array.from({ length: 10 }, (_, i) => resp({ fecha: dia(i < 5 ? 12 : 13, 8 + i) }));
    expect(estadoUnidades([...antiguos, ...recientes], 'silaba')[0]?.dominada).toBe(true);
  });
  it('a reforzar: no dominadas con ≥5 intentos, de peor a mejor', () => {
    const lista = [
      ...Array.from({ length: 6 }, (_, i) => resp({ unidadObjetivo: 'bla', correcto: i < 2, fecha: dia(12, 8 + i) })),
      ...Array.from({ length: 6 }, (_, i) => resp({ unidadObjetivo: 'pa', patron: 'CV', correcto: i < 4, fecha: dia(12, 8 + i) })),
      ...Array.from({ length: 3 }, () => resp({ unidadObjetivo: 'tre', correcto: false })),
    ];
    expect(aReforzar(estadoUnidades(lista, 'silaba')).map((e) => e.unidad)).toEqual(['bla', 'pa']);
  });
});

describe('distribucionErrores', () => {
  it('cuenta los errores por tipo; los de lectura en voz alta aparte', () => {
    const d = distribucionErrores([
      resp({ correcto: false, errorTipo: 'inversion' }),
      resp({ correcto: false, errorTipo: 'inversion' }),
      resp({ correcto: false, errorTipo: 'espejo' }),
      resp({ correcto: false, errorTipo: null, mecanica: 'carrera' }),
      resp({ correcto: true }),
    ]);
    expect(d).toEqual([
      { tipo: 'inversion', nombre: 'Inversión', cantidad: 2 },
      { tipo: 'espejo', nombre: 'Espejo', cantidad: 1 },
      { tipo: 'lectura', nombre: 'Lectura en voz alta', cantidad: 1 },
    ]);
  });
});

const res = (p: Partial<ResultadoNivel>): ResultadoNivel => ({
  nivelId: 'm1-n1', mecanica: 'intrusa', estrellas: 2, duracionMs: 60000, contexto: 'casa', fecha: dia(12), ...p,
});

describe('evolucionSemanal y comparativa', () => {
  const resultados = [
    res({ fecha: dia(12) }),
    res({ fecha: dia(12, 19), mecanica: 'carrera', pcpm: 10 }),
    res({ fecha: dia(14), contexto: 'tutoria', mecanica: 'carrera', pcpm: 20, duracionMs: 120000 }),
    res({ fecha: dia(20), estrellas: 3, mecanica: 'carrera', pcpm: 24 }),
  ];

  it('agrupa por semana: PCPM medio, estrellas, sesiones y minutos por contexto', () => {
    expect(evolucionSemanal(resultados)).toEqual([
      { semana: '2026-10-12', pcpm: 15, estrellas: 6, niveles: 3, sesionesCasa: 1, sesionesTutoria: 1, minutosCasa: 2, minutosTutoria: 2 },
      { semana: '2026-10-19', pcpm: 24, estrellas: 3, niveles: 1, sesionesCasa: 1, sesionesTutoria: 0, minutosCasa: 1, minutosTutoria: 0 },
    ]);
  });

  it('compara casa y tutoría', () => {
    const c = comparativaContextos(
      [resp({ contexto: 'casa' }), resp({ contexto: 'casa', correcto: false }), resp({ contexto: 'tutoria' })],
      resultados,
    );
    expect(c[0]).toMatchObject({ contexto: 'casa', respuestas: 2, porcentajeAcierto: 50, pcpmMedia: 17, sesiones: 2 });
    expect(c[1]).toMatchObject({ contexto: 'tutoria', respuestas: 1, porcentajeAcierto: 100, pcpmMedia: 20, sesiones: 1 });
  });
});
