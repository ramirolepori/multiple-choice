import fs from 'fs';
import path from 'path';
import type { Materia } from '../types';
import { validarMateria } from './quiz';

const dataDir = path.join(process.cwd(), 'data');

/**
 * Lee el banco de preguntas desde /data. El orden de readdirSync no está
 * garantizado entre sistemas de archivos, así que ordenamos explícitamente
 * para que la materia preseleccionada sea siempre la misma.
 */
export function getMaterias(): Materia[] {
  const archivos = fs.readdirSync(dataDir).filter((archivo) => archivo.endsWith('.json'));

  const materias = archivos.map((archivo) => {
    const ruta = path.join(dataDir, archivo);
    let materia: Materia;
    try {
      materia = JSON.parse(fs.readFileSync(ruta, 'utf-8')) as Materia;
    } catch (error) {
      throw new Error(`No se pudo leer ${archivo}: ${(error as Error).message}`);
    }

    const problemas = validarMateria(materia, archivo);
    if (problemas.length) {
      // No cortamos el build por un dato flojo, pero queda visible al levantar la app.
      console.warn(
        `[materias] ${archivo}: ${problemas.length} problema(s) de datos\n` +
          problemas.map(({ problema }) => `  - ${problema}`).join('\n'),
      );
    }

    return materia;
  });

  return materias.sort((a, b) => a.materia.localeCompare(b.materia, 'es'));
}
