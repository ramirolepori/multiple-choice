import { describe, expect, it } from 'vitest';
import type { Materia, Pregunta } from '../types';
import {
  PUNTAJE_MAXIMO,
  ajustarCantidad,
  calcularPuntaje,
  contarPorTema,
  esMultiple,
  estadoPregunta,
  filtrarPorTemas,
  formatearTiempo,
  idsCorrectos,
  opcionesDeCantidad,
  parcialesDe,
  resumenTest,
  shuffle,
  validarMateria,
} from '../lib/quiz';

const unaCorrecta: Pregunta = {
  id: 1,
  parcial: 1,
  texto: '¿Una sola correcta?',
  respuestas: [
    { id: 'a', texto: 'Sí', correcta: true },
    { id: 'b', texto: 'No', correcta: false },
    { id: 'c', texto: 'Tal vez', correcta: false },
  ],
};

const dosCorrectas: Pregunta = {
  id: 2,
  parcial: 1,
  texto: '¿Dos correctas?',
  respuestas: [
    { id: 'a', texto: 'Una', correcta: true },
    { id: 'b', texto: 'Otra', correcta: true },
    { id: 'c', texto: 'Ninguna', correcta: false },
    { id: 'd', texto: 'Tampoco', correcta: false },
  ],
};

describe('shuffle', () => {
  it('conserva todos los elementos sin mutar el original', () => {
    const original = [1, 2, 3, 4, 5];
    const copia = [...original];
    const mezclado = shuffle(original);

    expect(original).toEqual(copia);
    expect(mezclado).not.toBe(original);
    expect([...mezclado].sort((a, b) => a - b)).toEqual(copia);
  });

  it('es determinístico con un rng inyectado', () => {
    const valores = [0.1, 0.9, 0.4, 0.7, 0.2];
    const rng = () => {
      const valor = valores.shift() ?? 0;
      valores.push(valor);
      return valor;
    };
    const a = shuffle(['a', 'b', 'c', 'd', 'e'], rng);

    const valoresB = [0.1, 0.9, 0.4, 0.7, 0.2];
    const rngB = () => {
      const valor = valoresB.shift() ?? 0;
      valoresB.push(valor);
      return valor;
    };
    expect(shuffle(['a', 'b', 'c', 'd', 'e'], rngB)).toEqual(a);
  });

  it('no se sale del rango aunque el rng devuelva 1', () => {
    const mezclado = shuffle(['a', 'b', 'c'], () => 1);
    expect(mezclado).toHaveLength(3);
    expect(mezclado.every((valor) => valor !== undefined)).toBe(true);
  });

  it('reparte las posiciones de forma pareja', () => {
    // El sort(() => Math.random() - 0.5) anterior dejaba al primer elemento
    // en su lugar mucho más del 1/5 que le corresponde.
    const vueltas = 4000;
    let primeroQuedaPrimero = 0;
    for (let i = 0; i < vueltas; i += 1) {
      if (shuffle([0, 1, 2, 3, 4])[0] === 0) primeroQuedaPrimero += 1;
    }
    const proporcion = primeroQuedaPrimero / vueltas;
    expect(proporcion).toBeGreaterThan(0.15);
    expect(proporcion).toBeLessThan(0.25);
  });
});

describe('calcularPuntaje', () => {
  it('da el valor completo de la pregunta cuando se acierta', () => {
    expect(calcularPuntaje(unaCorrecta, ['a'], 10)).toBeCloseTo(1);
    expect(calcularPuntaje(unaCorrecta, ['a'], 4)).toBeCloseTo(2.5);
  });

  it('da cero cuando se elige una incorrecta', () => {
    expect(calcularPuntaje(unaCorrecta, ['b'], 10)).toBe(0);
  });

  it('nunca devuelve puntaje negativo', () => {
    expect(calcularPuntaje(dosCorrectas, ['c', 'd'], 10)).toBe(0);
  });

  it('reparte el valor entre las correctas en preguntas de opción múltiple', () => {
    expect(calcularPuntaje(dosCorrectas, ['a', 'b'], 10)).toBeCloseTo(1);
    expect(calcularPuntaje(dosCorrectas, ['a'], 10)).toBeCloseTo(0.5);
  });

  it('descuenta los errores con el mismo peso que los aciertos', () => {
    expect(calcularPuntaje(dosCorrectas, ['a', 'c'], 10)).toBe(0);
    expect(calcularPuntaje(dosCorrectas, ['a', 'b', 'c'], 10)).toBeCloseTo(0.5);
  });

  it('no puntúa lo que quedó sin responder', () => {
    expect(calcularPuntaje(unaCorrecta, [], 10)).toBe(0);
  });

  it('no divide por cero cuando no hay preguntas', () => {
    expect(calcularPuntaje(unaCorrecta, ['a'], 0)).toBe(0);
  });

  it('un test perfecto suma exactamente el puntaje máximo', () => {
    const preguntas = [unaCorrecta, dosCorrectas];
    const total = calcularPuntaje(unaCorrecta, ['a'], 2) + calcularPuntaje(dosCorrectas, ['a', 'b'], 2);
    expect(total).toBeCloseTo(PUNTAJE_MAXIMO);
    expect(preguntas).toHaveLength(2);
  });
});

describe('estadoPregunta', () => {
  it('distingue los cuatro estados posibles', () => {
    expect(estadoPregunta(dosCorrectas, [])).toBe('sin-responder');
    expect(estadoPregunta(dosCorrectas, ['a', 'b'])).toBe('correcta');
    expect(estadoPregunta(dosCorrectas, ['a'])).toBe('parcial');
    expect(estadoPregunta(dosCorrectas, ['c'])).toBe('incorrecta');
  });

  it('marca como parcial cuando mezcla acierto y error', () => {
    expect(estadoPregunta(dosCorrectas, ['a', 'c'])).toBe('parcial');
  });

  it('no considera correcta una respuesta que suma opciones de más', () => {
    expect(estadoPregunta(dosCorrectas, ['a', 'b', 'c'])).toBe('parcial');
  });
});

describe('resumenTest', () => {
  it('cuenta estados y calcula el porcentaje sobre el puntaje máximo', () => {
    const resumen = resumenTest([unaCorrecta, dosCorrectas], { '1': ['a'], '2': ['a'] });

    expect(resumen.total).toBe(2);
    expect(resumen.respondidas).toBe(2);
    expect(resumen.sinResponder).toBe(0);
    expect(resumen.correctas).toBe(1);
    expect(resumen.parciales).toBe(1);
    expect(resumen.puntaje).toBeCloseTo(7.5);
    expect(resumen.porcentaje).toBeCloseTo(75);
  });

  it('cuenta lo que quedó sin responder', () => {
    const resumen = resumenTest([unaCorrecta, dosCorrectas], { '1': ['a'] });
    expect(resumen.sinResponder).toBe(1);
    expect(resumen.respondidas).toBe(1);
  });

  it('no rompe con un test vacío', () => {
    expect(resumenTest([], {})).toMatchObject({ total: 0, puntaje: 0, porcentaje: 0 });
  });
});

describe('opcionesDeCantidad y ajustarCantidad', () => {
  it('ofrece siempre el total como opción', () => {
    expect(opcionesDeCantidad(7)).toEqual([7]);
    expect(opcionesDeCantidad(25)).toEqual([10, 20, 25]);
    expect(opcionesDeCantidad(30)).toEqual([10, 20, 30]);
    expect(opcionesDeCantidad(0)).toEqual([]);
  });

  it('nunca ofrece más preguntas de las que hay', () => {
    const opciones = opcionesDeCantidad(12);
    expect(Math.max(...opciones)).toBe(12);
  });

  it('corrige la cantidad cuando deja de ser una opción válida', () => {
    // El bug: al filtrar temas quedaban 3 preguntas, el <select> mostraba la
    // primera opción y el estado seguía en 20.
    expect(ajustarCantidad(20, [3])).toBe(3);
    expect(ajustarCantidad(20, [10, 15])).toBe(15);
    expect(ajustarCantidad(10, [10, 20])).toBe(10);
    expect(ajustarCantidad(5, [10, 20])).toBe(10);
    expect(ajustarCantidad(10, [])).toBe(0);
  });
});

describe('formatearTiempo', () => {
  it('usa mm:ss y agrega la hora solo si hace falta', () => {
    expect(formatearTiempo(0)).toBe('00:00');
    expect(formatearTiempo(9)).toBe('00:09');
    expect(formatearTiempo(75)).toBe('01:15');
    expect(formatearTiempo(3600)).toBe('1:00:00');
    expect(formatearTiempo(3725)).toBe('1:02:05');
  });

  it('no muestra tiempos negativos ni NaN', () => {
    expect(formatearTiempo(-30)).toBe('00:00');
    expect(formatearTiempo(Number.NaN)).toBe('00:00');
  });
});

describe('helpers de filtrado', () => {
  const preguntas: Pregunta[] = [
    { ...unaCorrecta, id: 1, parcial: 2, tema: 'Ruteo' },
    { ...unaCorrecta, id: 2, parcial: 1, tema: 'VLAN' },
    { ...unaCorrecta, id: 3, parcial: 1, tema: 'Ruteo' },
    { ...unaCorrecta, id: 4, parcial: 1 },
  ];

  it('lista los parciales ordenados y sin repetir', () => {
    expect(parcialesDe(preguntas)).toEqual([1, 2]);
  });

  it('cuenta las preguntas por tema en orden alfabético', () => {
    expect(contarPorTema(preguntas)).toEqual([
      { tema: 'Ruteo', cantidad: 2 },
      { tema: 'VLAN', cantidad: 1 },
    ]);
  });

  it('filtra por tema y conserva las preguntas sin clasificar', () => {
    const filtradas = filtrarPorTemas(preguntas, ['Ruteo'], true);
    expect(filtradas.map((pregunta) => pregunta.id)).toEqual([1, 3, 4]);
  });

  it('no filtra nada si la materia no usa temas', () => {
    expect(filtrarPorTemas(preguntas, [], false)).toHaveLength(4);
  });

  it('devuelve vacío si no se eligió ningún tema', () => {
    expect(filtrarPorTemas([preguntas[0], preguntas[1]], [], true)).toHaveLength(0);
  });
});

describe('idsCorrectos y esMultiple', () => {
  it('detecta preguntas de opción múltiple', () => {
    expect(esMultiple(unaCorrecta)).toBe(false);
    expect(esMultiple(dosCorrectas)).toBe(true);
    expect(idsCorrectos(dosCorrectas)).toEqual(['a', 'b']);
  });
});

describe('validarMateria', () => {
  const base: Materia = { materia: 'Demo', preguntas: [unaCorrecta] };

  it('acepta una materia bien formada', () => {
    expect(validarMateria(base)).toEqual([]);
  });

  it('detecta ids repetidos dentro del mismo parcial', () => {
    const problemas = validarMateria({
      materia: 'Demo',
      preguntas: [unaCorrecta, { ...unaCorrecta }],
    });
    expect(problemas.map((p) => p.problema)).toContainEqual(expect.stringContaining('id repetido'));
  });

  it('permite el mismo id en parciales distintos', () => {
    expect(validarMateria({ materia: 'Demo', preguntas: [unaCorrecta, { ...unaCorrecta, parcial: 2 }] })).toEqual(
      [],
    );
  });

  it('detecta preguntas sin respuesta correcta', () => {
    const problemas = validarMateria({
      materia: 'Demo',
      preguntas: [{ ...unaCorrecta, respuestas: unaCorrecta.respuestas.map((r) => ({ ...r, correcta: false })) }],
    });
    expect(problemas.map((p) => p.problema)).toContainEqual(expect.stringContaining('ninguna respuesta'));
  });

  it('detecta preguntas con todas las respuestas correctas', () => {
    const problemas = validarMateria({
      materia: 'Demo',
      preguntas: [{ ...unaCorrecta, respuestas: unaCorrecta.respuestas.map((r) => ({ ...r, correcta: true })) }],
    });
    expect(problemas.map((p) => p.problema)).toContainEqual(expect.stringContaining('todas las respuestas'));
  });

  it('detecta enunciados vacíos y materias sin preguntas', () => {
    expect(validarMateria({ materia: 'Demo', preguntas: [] })).toHaveLength(1);
    const problemas = validarMateria({ materia: 'Demo', preguntas: [{ ...unaCorrecta, texto: '  ' }] });
    expect(problemas.map((p) => p.problema)).toContainEqual(expect.stringContaining('sin enunciado'));
  });

  it('detecta ids de respuesta repetidos', () => {
    const problemas = validarMateria({
      materia: 'Demo',
      preguntas: [
        {
          ...unaCorrecta,
          respuestas: [
            { id: 'a', texto: 'Una', correcta: true },
            { id: 'a', texto: 'Otra', correcta: false },
          ],
        },
      ],
    });
    expect(problemas.map((p) => p.problema)).toContainEqual(expect.stringContaining('ids de respuesta repetidos'));
  });
});
