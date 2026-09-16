import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import type { Materia } from '../types';
import { estadoPregunta, idsCorrectos, preguntaKey, resumenTest, validarMateria } from '../lib/quiz';

const raizProyecto = process.cwd();
const carpetaDatos = path.join(raizProyecto, 'data');
const carpetaPublica = path.join(raizProyecto, 'public');

const archivos = fs.readdirSync(carpetaDatos).filter((archivo) => archivo.endsWith('.json'));

function leer(archivo: string): Materia {
  return JSON.parse(fs.readFileSync(path.join(carpetaDatos, archivo), 'utf-8')) as Materia;
}

describe('banco de preguntas', () => {
  it('hay al menos una materia cargada', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos)('%s es un JSON válido con la forma esperada', (archivo) => {
    const materia = leer(archivo);
    expect(typeof materia.materia).toBe('string');
    expect(Array.isArray(materia.preguntas)).toBe(true);
    expect(materia.preguntas.length).toBeGreaterThan(0);
  });

  it.each(archivos)('%s pasa las validaciones de integridad', (archivo) => {
    const problemas = validarMateria(leer(archivo), archivo);
    expect(problemas.map(({ problema }) => `${archivo}: ${problema}`)).toEqual([]);
  });

  it.each(archivos)('%s referencia imágenes que existen en public/', (archivo) => {
    const faltantes = leer(archivo)
      .preguntas.filter((pregunta) => pregunta.imagen)
      .map((pregunta) => pregunta.imagen as string)
      .filter((imagen) => !fs.existsSync(path.join(carpetaPublica, imagen.replace(/^\//, ''))));

    expect(faltantes).toEqual([]);
  });

  it('los nombres de materia son únicos entre archivos', () => {
    const nombres = archivos.map((archivo) => leer(archivo).materia);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it.each(archivos)('%s puede puntuarse de punta a punta', (archivo) => {
    // Responder todo bien tiene que dar 10 y todo mal tiene que dar 0,
    // sin importar cuántas correctas tenga cada pregunta.
    const preguntas = leer(archivo).preguntas.slice(0, 20);

    const todoBien = Object.fromEntries(
      preguntas.map((pregunta) => [preguntaKey(pregunta), idsCorrectos(pregunta)]),
    );
    const perfecto = resumenTest(preguntas, todoBien);
    expect(perfecto.puntaje).toBeCloseTo(10, 1);
    expect(perfecto.correctas).toBe(preguntas.length);

    const todoMal = Object.fromEntries(
      preguntas.map((pregunta) => [
        preguntaKey(pregunta),
        pregunta.respuestas.filter((respuesta) => !respuesta.correcta).map((respuesta) => respuesta.id),
      ]),
    );
    expect(resumenTest(preguntas, todoMal).puntaje).toBe(0);

    const sinResponder = resumenTest(preguntas, {});
    expect(sinResponder.puntaje).toBe(0);
    expect(sinResponder.sinResponder).toBe(preguntas.length);
  });

  it.each(archivos)('%s marca como correcta la selección exacta de cada pregunta', (archivo) => {
    const desalineadas = leer(archivo)
      .preguntas.filter((pregunta) => estadoPregunta(pregunta, idsCorrectos(pregunta)) !== 'correcta')
      .map((pregunta) => pregunta.id);

    expect(desalineadas).toEqual([]);
  });
});
