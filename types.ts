export type Respuesta = {
  id: string;
  texto: string;
  correcta: boolean;
};

export type Pregunta = {
  id: number;
  texto: string;
  respuestas: Respuesta[];
};

export type Materia = {
  materia: string;
  preguntas: Pregunta[];
};

export type RespuestaSeleccion = Record<string, string[]>;
