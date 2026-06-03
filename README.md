# Multiple Choice

Plataforma simple de tests de estudio hecha con Next.js + React + Tailwind CSS.

## Cómo usar

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir `http://localhost:3000`

## Datos de preguntas

Los bancos de preguntas se encuentran en `data/` como archivos JSON.
Formato de ejemplo:

```json
{
  "materia": "Matemáticas",
  "preguntas": [
    {
      "id": 1,
      "texto": "¿Cuánto es 2+2?",
      "imagen": "/images/ejemplo.png",
      "respuestas": [
        { "id": "a", "texto": "4", "correcta": true },
        { "id": "b", "texto": "5", "correcta": false }
      ]
    }
  ]
}
```

Las imágenes locales deben guardarse en `public/` y referenciarse desde el JSON con rutas a partir de `/`, por ejemplo `/images/mi-imagen.png`.

## Deploy en Vercel

1. Subir el proyecto a GitHub.
2. Conectar el repositorio en Vercel.
3. Vercel detectará automáticamente el proyecto Next.js.

## Notas

- No guarda progreso entre sesiones.
- El puntaje total del test siempre se escala a 10 puntos.
- Cada pregunta vale 10 dividido por la cantidad de preguntas seleccionadas.
- Cada respuesta correcta suma y cada incorrecta resta el mismo peso.
- El límite de tiempo es opcional y solo se aplica si lo activas.
