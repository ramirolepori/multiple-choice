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

## Tests

```bash
npm test          # corre todo una vez
npm run test:watch
npm run typecheck
```

Hay tres suites en `tests/`:

- `quiz.test.ts`: la lógica pura de `lib/quiz.ts` (puntaje, barajado, filtros, validaciones).
- `datos.test.ts`: recorre los JSON de `data/` y verifica que estén bien formados y que las imágenes existan. Si agregás preguntas nuevas, esta suite te avisa si quedó algo mal.
- `TestApp.test.tsx`: el flujo completo de la app (configurar, responder, enviar, revisar).

## Datos de preguntas

Los bancos de preguntas se encuentran en `data/` como archivos JSON.
Formato de ejemplo:

```json
{
  "materia": "Matemáticas",
  "preguntas": [
    {
      "id": 1,
      "parcial": 1,
      "tema": "Aritmética",
      "texto": "¿Cuánto es 2+2?",
      "imagen": "/images/ejemplo.png",
      "explicacion": "Suma básica.",
      "respuestas": [
        { "id": "a", "texto": "4", "correcta": true },
        { "id": "b", "texto": "5", "correcta": false }
      ]
    }
  ]
}
```

`parcial` es obligatorio y agrupa las preguntas en el selector. `tema`, `imagen` y `explicacion` son opcionales: si ninguna pregunta de un parcial tiene `tema`, el filtro de temas no se muestra.

Los `id` tienen que ser únicos dentro de cada parcial. Las imágenes locales van en `public/` y se referencian desde el JSON con rutas a partir de `/`, por ejemplo `/images/mi-imagen.png`.

## Deploy en Vercel

1. Subir el proyecto a GitHub.
2. Conectar el repositorio en Vercel.
3. Vercel detectará automáticamente el proyecto Next.js.

## Notas

- Las imágenes se abren a pantalla completa: pellizco, doble toque, rueda del mouse o los botones
  para acercar, y arrastre (o las flechas del teclado) para recorrer el diagrama.
- No guarda progreso entre sesiones (solo recuerda tu nombre en el navegador).
- El puntaje total del test siempre se escala a 10 puntos.
- Cada pregunta vale 10 dividido por la cantidad de preguntas seleccionadas.
- Cada respuesta correcta suma y cada incorrecta resta el mismo peso.
- El límite de tiempo es opcional y solo se aplica si lo activas.
