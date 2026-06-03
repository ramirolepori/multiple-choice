import fs from 'fs';
import path from 'path';
import type { Materia } from '../types';

const dataDir = path.join(process.cwd(), 'data');

export function getMaterias(): Materia[] {
  const files = fs.readdirSync(dataDir).filter((file) => file.endsWith('.json'));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    return JSON.parse(raw) as Materia;
  });
}
