import type { Materia, Pregunta } from '../types';

/** Puntaje máximo de cualquier test, sin importar cuántas preguntas tenga. */
export const PUNTAJE_MAXIMO = 10;

/** Cantidades ofrecidas en el selector; se filtran por las preguntas disponibles. */
export const CANTIDADES_SUGERIDAS = [10, 20, 30, 50];

export type EstadoPregunta = 'sin-responder' | 'correcta' | 'parcial' | 'incorrecta';

export type ResumenTest = {
  total: number;
  respondidas: number;
  sinResponder: number;
  correctas: number;
  parciales: number;
  incorrectas: number;
  puntaje: number;
  porcentaje: number;
};

export function preguntaKey(pregunta: Pregunta): string {
  return String(pregunta.id);
}

export function idsCorrectos(pregunta: Pregunta): string[] {
  return pregunta.respuestas.filter((respuesta) => respuesta.correcta).map((respuesta) => respuesta.id);
}

/** Una pregunta es de selección múltiple cuando tiene más de una respuesta correcta. */
export function esMultiple(pregunta: Pregunta): boolean {
  return idsCorrectos(pregunta).length > 1;
}

/**
 * Fisher-Yates. `sort(() => Math.random() - 0.5)` no genera permutaciones
 * uniformes: el orden dependía del algoritmo de sort del motor y algunas
 * preguntas salían casi siempre en la misma posición.
 * El rng se inyecta para poder testear el barajado de forma determinística.
 */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Cada pregunta vale PUNTAJE_MAXIMO / cantidad de preguntas.
 * Ese valor se reparte entre las respuestas correctas: cada acierto suma
 * una parte y cada error resta la misma parte. El mínimo por pregunta es 0.
 */
export function calcularPuntaje(pregunta: Pregunta, seleccion: string[], totalPreguntas: number): number {
  if (totalPreguntas <= 0) return 0;
  const correctas = idsCorrectos(pregunta);
  const valorPregunta = PUNTAJE_MAXIMO / totalPreguntas;
  const valorPorRespuesta = valorPregunta / Math.max(correctas.length, 1);
  const aciertos = seleccion.filter((id) => correctas.includes(id)).length;
  const errores = seleccion.filter((id) => !correctas.includes(id)).length;
  return Math.max(0, aciertos * valorPorRespuesta - errores * valorPorRespuesta);
}

export function estadoPregunta(pregunta: Pregunta, seleccion: string[]): EstadoPregunta {
  if (seleccion.length === 0) return 'sin-responder';
  const correctas = idsCorrectos(pregunta);
  const aciertos = seleccion.filter((id) => correctas.includes(id)).length;
  const errores = seleccion.length - aciertos;
  if (errores === 0 && aciertos === correctas.length) return 'correcta';
  if (aciertos === 0) return 'incorrecta';
  return 'parcial';
}

function redondear(valor: number, decimales: number): number {
  return Number(valor.toFixed(decimales));
}

export function resumenTest(preguntas: Pregunta[], selecciones: Record<string, string[]>): ResumenTest {
  const resumen = preguntas.reduce<ResumenTest>(
    (acum, pregunta) => {
      const seleccion = selecciones[preguntaKey(pregunta)] ?? [];
      const estado = estadoPregunta(pregunta, seleccion);
      if (estado === 'sin-responder') acum.sinResponder += 1;
      else acum.respondidas += 1;
      if (estado === 'correcta') acum.correctas += 1;
      if (estado === 'parcial') acum.parciales += 1;
      if (estado === 'incorrecta') acum.incorrectas += 1;
      acum.puntaje += calcularPuntaje(pregunta, seleccion, preguntas.length);
      return acum;
    },
    {
      total: preguntas.length,
      respondidas: 0,
      sinResponder: 0,
      correctas: 0,
      parciales: 0,
      incorrectas: 0,
      puntaje: 0,
      porcentaje: 0,
    },
  );

  resumen.puntaje = redondear(resumen.puntaje, 2);
  resumen.porcentaje = preguntas.length ? redondear((resumen.puntaje / PUNTAJE_MAXIMO) * 100, 1) : 0;
  return resumen;
}

/**
 * Opciones válidas del selector de cantidad. Siempre incluye el total para que
 * el valor elegido exista aunque las preguntas disponibles no sean un número redondo.
 */
export function opcionesDeCantidad(total: number): number[] {
  if (total <= 0) return [];
  const opciones = new Set(CANTIDADES_SUGERIDAS.filter((valor) => valor < total));
  opciones.add(total);
  return Array.from(opciones).sort((a, b) => a - b);
}

/**
 * Mantiene sincronizados el <select> y el estado: si la cantidad guardada dejó de
 * ser una opción válida (porque cambió el filtro de temas) devuelve la opción
 * más cercana hacia abajo. Antes el select mostraba un valor y el test usaba otro.
 */
export function ajustarCantidad(cantidad: number, opciones: number[]): number {
  if (opciones.length === 0) return 0;
  if (opciones.includes(cantidad)) return cantidad;
  const menores = opciones.filter((valor) => valor < cantidad);
  return menores.length ? Math.max(...menores) : Math.min(...opciones);
}

export function formatearTiempo(segundos: number): string {
  const seguros = Number.isFinite(segundos) ? Math.max(0, Math.floor(segundos)) : 0;
  const horas = Math.floor(seguros / 3600);
  const minutos = Math.floor((seguros % 3600) / 60);
  const resto = seguros % 60;
  const mm = minutos.toString().padStart(2, '0');
  const ss = resto.toString().padStart(2, '0');
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function parcialesDe(preguntas: Pregunta[]): number[] {
  return Array.from(new Set(preguntas.map((pregunta) => pregunta.parcial))).sort((a, b) => a - b);
}

export function contarPorTema(preguntas: Pregunta[]): { tema: string; cantidad: number }[] {
  const conteo = new Map<string, number>();
  preguntas.forEach((pregunta) => {
    if (pregunta.tema) conteo.set(pregunta.tema, (conteo.get(pregunta.tema) ?? 0) + 1);
  });
  return Array.from(conteo.entries())
    .map(([tema, cantidad]) => ({ tema, cantidad }))
    .sort((a, b) => a.tema.localeCompare(b.tema, 'es'));
}

/** Si la materia no clasifica sus preguntas por tema, no se filtra nada. */
export function filtrarPorTemas(preguntas: Pregunta[], temas: string[], hayTemas: boolean): Pregunta[] {
  if (!hayTemas) return preguntas;
  return preguntas.filter((pregunta) => !pregunta.tema || temas.includes(pregunta.tema));
}

export type ProblemaMateria = { archivo: string; problema: string };

/**
 * Chequeos de integridad del banco de preguntas: los usa el loader para avisar
 * en consola y los tests para que un JSON mal armado no llegue a producción.
 */
export function validarMateria(materia: Materia, archivo?: string): ProblemaMateria[] {
  const origen = archivo ?? materia?.materia ?? 'desconocido';
  const problemas: ProblemaMateria[] = [];
  const avisar = (problema: string) => problemas.push({ archivo: origen, problema });

  if (!materia || typeof materia.materia !== 'string' || !materia.materia.trim()) {
    avisar('falta el nombre de la materia');
    return problemas;
  }
  if (!Array.isArray(materia.preguntas) || materia.preguntas.length === 0) {
    avisar('no tiene preguntas');
    return problemas;
  }

  const vistas = new Set<string>();
  materia.preguntas.forEach((pregunta, indice) => {
    const etiqueta = `pregunta ${pregunta?.id ?? `#${indice}`}`;
    if (pregunta?.id === undefined || pregunta.id === null) {
      avisar(`${etiqueta}: sin id`);
      return;
    }

    const clave = `${pregunta.parcial}:${pregunta.id}`;
    if (vistas.has(clave)) avisar(`${etiqueta}: id repetido dentro del parcial ${pregunta.parcial}`);
    vistas.add(clave);

    if (!Number.isFinite(pregunta.parcial)) avisar(`${etiqueta}: parcial inválido`);
    if (typeof pregunta.texto !== 'string' || !pregunta.texto.trim()) avisar(`${etiqueta}: sin enunciado`);

    if (!Array.isArray(pregunta.respuestas) || pregunta.respuestas.length < 2) {
      avisar(`${etiqueta}: necesita al menos 2 respuestas`);
      return;
    }

    const correctas = idsCorrectos(pregunta);
    if (correctas.length === 0) avisar(`${etiqueta}: ninguna respuesta marcada como correcta`);
    if (correctas.length === pregunta.respuestas.length) avisar(`${etiqueta}: todas las respuestas son correctas`);

    const ids = pregunta.respuestas.map((respuesta) => respuesta.id);
    if (new Set(ids).size !== ids.length) avisar(`${etiqueta}: ids de respuesta repetidos`);

    pregunta.respuestas.forEach((respuesta) => {
      if (typeof respuesta.texto !== 'string' || !respuesta.texto.trim()) {
        avisar(`${etiqueta}: la respuesta ${respuesta.id} no tiene texto`);
      }
    });
  });

  return problemas;
}
