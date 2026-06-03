import type { Materia } from '../types';
import { getMaterias } from '../lib/materias';
import TestApp from '../components/TestApp';

export default function HomePage() {
  const materias = getMaterias();

  return <TestApp materias={materias} />;
}

