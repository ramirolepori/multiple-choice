import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Materia, Pregunta } from '../types';
import TestApp from '../components/TestApp';

/**
 * Las respuestas correctas se llaman siempre "Correcta N" y las incorrectas
 * "Incorrecta N", así los tests pueden responder bien o mal sin conocer el orden
 * en que salieron barajadas.
 */
function crearPregunta(id: number, parcial: number, tema: string | undefined, correctas = 1): Pregunta {
  const respuestas = [
    ...Array.from({ length: correctas }, (_, i) => ({
      id: `c${i}`,
      texto: `Correcta ${id}${i > 0 ? ` bis${i}` : ''}`,
      correcta: true,
    })),
    { id: 'x0', texto: `Incorrecta ${id} A`, correcta: false },
    { id: 'x1', texto: `Incorrecta ${id} B`, correcta: false },
  ];
  return { id, parcial, tema, texto: `Enunciado ${id}`, respuestas };
}

/** 12 preguntas de "Alfa" y 3 de "Beta" en el parcial 1; 4 de "Gamma" en el 2. */
const materiaGrande: Materia = {
  materia: 'Materia Grande',
  preguntas: [
    ...Array.from({ length: 12 }, (_, i) => crearPregunta(i + 1, 1, 'Alfa')),
    ...Array.from({ length: 3 }, (_, i) => crearPregunta(i + 13, 1, 'Beta')),
    ...Array.from({ length: 4 }, (_, i) => crearPregunta(i + 100, 2, 'Gamma')),
  ],
};

/** Tres preguntas sin temas: el test entero entra en una pantalla. */
const materiaChica: Materia = {
  materia: 'Materia Chica',
  preguntas: [crearPregunta(1, 1, undefined), crearPregunta(2, 1, undefined, 2), crearPregunta(3, 1, undefined)],
};

const comenzar = () => screen.getByRole('button', { name: /comenzar test/i });

async function responderTodoBien(user: ReturnType<typeof userEvent.setup>) {
  const opciones = [
    ...screen.queryAllByRole('radio', { name: /^Correcta/ }),
    ...screen.queryAllByRole('checkbox', { name: /^Correcta/ }),
  ];
  for (const opcion of opciones) {
    await user.click(opcion);
  }
}

describe('TestApp · pantalla de inicio', () => {
  it('muestra la configuración inicial con la materia y el parcial disponibles', () => {
    render(<TestApp materias={[materiaGrande]} />);

    expect(screen.getByRole('combobox', { name: /materia/i })).toHaveValue('Materia Grande');
    expect(screen.getByRole('combobox', { name: /parcial/i })).toHaveValue('1');
    expect(comenzar()).toBeEnabled();
  });

  it('avisa cuando no hay materias cargadas en lugar de romperse', () => {
    render(<TestApp materias={[]} />);
    expect(screen.getByText(/no hay materias cargadas/i)).toBeInTheDocument();
  });

  it('filtra las preguntas disponibles al destildar un tema', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaGrande]} />);

    expect(screen.getByText(/15 preguntas disponibles/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /beta/i }));
    expect(screen.getByText(/12 preguntas disponibles/i)).toBeInTheDocument();
  });

  it('deshabilita el inicio si no queda ningún tema seleccionado', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaGrande]} />);

    await user.click(screen.getByRole('button', { name: /^ninguno$/i }));

    expect(screen.getByText(/seleccioná al menos uno/i)).toBeInTheDocument();
    expect(comenzar()).toBeDisabled();
  });

  it('mantiene el selector de cantidad sincronizado con las preguntas disponibles', async () => {
    // Bug: al reducir las preguntas por tema, el <select> mostraba la primera
    // opción pero el estado seguía en el valor viejo y arrancaba con otra cantidad.
    const user = userEvent.setup();
    render(<TestApp materias={[materiaGrande]} />);

    const cantidad = screen.getByRole('combobox', { name: /cantidad de preguntas/i });
    await user.selectOptions(cantidad, '10');
    expect(cantidad).toHaveValue('10');

    await user.click(screen.getByRole('button', { name: /alfa/i })); // quedan las 3 de Beta
    expect(cantidad).toHaveValue('3');

    await user.click(comenzar());
    expect(screen.getByText(/0 de 3 respondidas/i)).toBeInTheDocument();
  });

  it('cambia de parcial y ofrece los temas de ese parcial', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaGrande]} />);

    await user.selectOptions(screen.getByRole('combobox', { name: /parcial/i }), '2');

    expect(screen.getByRole('button', { name: /gamma/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /alfa/i })).not.toBeInTheDocument();
    expect(screen.getByText(/4 preguntas disponibles/i)).toBeInTheDocument();
  });
});

describe('TestApp · scroll al cambiar de pantalla', () => {
  beforeEach(() => {
    vi.mocked(window.scrollTo).mockClear();
  });

  it('vuelve al principio de la página al comenzar el test', async () => {
    // Éste es el bug reportado: el test arrancaba a mitad de la lista y se
    // salteaban preguntas sin haberlas visto.
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);

    vi.mocked(window.scrollTo).mockClear();
    await user.click(comenzar());

    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0, behavior: 'instant' }));
  });

  it('vuelve al principio al mostrar los resultados', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());
    await responderTodoBien(user);

    vi.mocked(window.scrollTo).mockClear();
    await user.click(screen.getByRole('button', { name: /enviar respuestas/i }));

    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});

describe('TestApp · durante el test', () => {
  it('usa radios cuando hay una sola correcta y checkboxes cuando hay varias', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());

    // La pregunta 2 del fixture tiene dos respuestas correctas.
    const multiple = screen.getByRole('heading', { name: 'Enunciado 2' }).closest('article')!;
    expect(within(multiple).getAllByRole('checkbox')).toHaveLength(4);
    expect(within(multiple).getByText(/varias correctas/i)).toBeInTheDocument();

    const simple = screen.getByRole('heading', { name: 'Enunciado 1' }).closest('article')!;
    expect(within(simple).getAllByRole('radio')).toHaveLength(3);
  });

  it('actualiza el contador de respondidas y el estado de cada pregunta', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());

    expect(screen.getByText(/0 de 3 respondidas/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sin responder/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('radio', { name: 'Correcta 1' }));

    expect(screen.getByText(/1 de 3 respondidas/i)).toBeInTheDocument();
    const primera = screen.getByRole('heading', { name: 'Enunciado 1' }).closest('article')!;
    expect(within(primera).getByText('Respondida')).toBeInTheDocument();
  });

  it('permite limpiar una respuesta y volver a dejarla sin responder', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());

    await user.click(screen.getByRole('radio', { name: 'Correcta 1' }));
    const primera = screen.getByRole('heading', { name: 'Enunciado 1' }).closest('article')!;

    await user.click(within(primera).getByRole('button', { name: /limpiar respuesta/i }));

    expect(screen.getByText(/0 de 3 respondidas/i)).toBeInTheDocument();
    expect(within(primera).getByText('Sin responder')).toBeInTheDocument();
  });

  it('en una pregunta de varias correctas suma y saca opciones sin pisar la anterior', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());

    const multiple = screen.getByRole('heading', { name: 'Enunciado 2' }).closest('article')!;
    const primera = within(multiple).getByRole('checkbox', { name: 'Correcta 2' });
    const segunda = within(multiple).getByRole('checkbox', { name: 'Correcta 2 bis1' });

    await user.click(primera);
    await user.click(segunda);
    expect(primera).toBeChecked();
    expect(segunda).toBeChecked();

    await user.click(primera);
    expect(primera).not.toBeChecked();
    expect(segunda).toBeChecked();
  });

  it('el índice lista todas las preguntas del test', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());

    await user.click(screen.getByRole('button', { name: /índice de preguntas/i }));

    expect(screen.getByRole('button', { name: /ir a la pregunta 1, sin responder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ir a la pregunta 3, sin responder/i })).toBeInTheDocument();
  });
});

describe('TestApp · envío', () => {
  it('pide confirmación cuando quedan preguntas sin responder', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());
    await user.click(screen.getByRole('radio', { name: 'Correcta 1' }));

    await user.click(screen.getByRole('button', { name: /enviar respuestas/i }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/te faltan 2 preguntas/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Resultado$/i)).not.toBeInTheDocument();

    await user.click(within(dialogo).getByRole('button', { name: /seguir respondiendo/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/1 de 3 respondidas/i)).toBeInTheDocument();
  });

  it('envía sin preguntar cuando está todo respondido', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());
    await responderTodoBien(user);

    await user.click(screen.getByRole('button', { name: /enviar respuestas/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/sacaste/i)).toBeInTheDocument();
  });

  it('calcula 10 sobre 10 con todas las respuestas correctas', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());
    await responderTodoBien(user);
    await user.click(screen.getByRole('button', { name: /enviar respuestas/i }));

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^todas 3$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^correctas 3$/i })).toBeInTheDocument();
  });

  it('cuenta como cero lo que se envía sin responder', async () => {
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());

    await user.click(screen.getByRole('button', { name: /enviar respuestas/i }));
    await user.click(screen.getByRole('button', { name: /enviar igual/i }));

    expect(screen.getByText(/0%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^para repasar 3$/i })).toBeInTheDocument();
  });
});

describe('TestApp · resultados', () => {
  const llegarAResultados = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<TestApp materias={[materiaChica]} />);
    await user.click(comenzar());
    await user.click(screen.getByRole('radio', { name: 'Correcta 1' }));
    await user.click(screen.getByRole('radio', { name: 'Incorrecta 3 A' }));
    await user.click(screen.getByRole('button', { name: /enviar respuestas/i }));
    await user.click(screen.getByRole('button', { name: /enviar igual/i }));
  };

  it('desglosa correctas, incorrectas y sin responder', async () => {
    const user = userEvent.setup();
    await llegarAResultados(user);

    expect(screen.getByRole('button', { name: /^correctas 1$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^para repasar 2$/i })).toBeInTheDocument();
    expect(screen.getByText(/33.3%/)).toBeInTheDocument();
  });

  it('filtra el detalle para ver solo lo que hay que repasar', async () => {
    const user = userEvent.setup();
    await llegarAResultados(user);

    await user.click(screen.getByRole('button', { name: /^para repasar 2$/i }));

    expect(screen.queryByRole('heading', { name: 'Enunciado 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enunciado 3' })).toBeInTheDocument();
  });

  it('vuelve a la configuración sin arrastrar las respuestas anteriores', async () => {
    const user = userEvent.setup();
    await llegarAResultados(user);

    await user.click(screen.getByRole('button', { name: /cambiar configuración/i }));
    expect(comenzar()).toBeInTheDocument();

    await user.click(comenzar());
    expect(screen.getByText(/0 de 3 respondidas/i)).toBeInTheDocument();
  });

  it('repite las mismas preguntas con las respuestas en blanco', async () => {
    const user = userEvent.setup();
    await llegarAResultados(user);

    await user.click(screen.getByRole('button', { name: /repetir estas preguntas/i }));

    expect(screen.getByText(/0 de 3 respondidas/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enunciado 1' })).toBeInTheDocument();
  });
});

describe('TestApp · límite de tiempo', () => {
  /*
   * Acá usamos fireEvent en vez de user-event: con el reloj falso, user-event
   * queda esperando promesas que nadie resuelve. Y solo falseamos lo que usa el
   * contador, porque falsear queueMicrotask o performance frena al scheduler de React.
   */
  const usarRelojFalso = () =>
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });

  const responderTodoBienSync = () => {
    [
      ...screen.queryAllByRole('radio', { name: /^Correcta/ }),
      ...screen.queryAllByRole('checkbox', { name: /^Correcta/ }),
    ].forEach((opcion) => fireEvent.click(opcion));
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('corrige con las respuestas marcadas cuando se acaba el tiempo', () => {
    // Bug: el intervalo capturaba la primera versión de onEnviar, así que al
    // vencer el tiempo se corregía contra las selecciones vacías del arranque
    // y el resultado siempre daba 0.
    usarRelojFalso();
    render(<TestApp materias={[materiaChica]} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /límite de tiempo/i }));
    fireEvent.click(comenzar());
    responderTodoBienSync();
    expect(screen.getByText(/3 de 3 respondidas/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    });

    expect(screen.getByText(/sacaste/i)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('descuenta el tiempo restante mientras se responde', () => {
    usarRelojFalso();
    render(<TestApp materias={[materiaChica]} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /límite de tiempo/i }));
    fireEvent.click(comenzar());
    expect(screen.getByRole('timer')).toHaveTextContent('15:00');

    act(() => {
      vi.advanceTimersByTime(65_000);
    });

    expect(screen.getByRole('timer')).toHaveTextContent('13:55');
  });

  it('cuenta el tiempo transcurrido cuando no hay límite', () => {
    usarRelojFalso();
    render(<TestApp materias={[materiaChica]} />);

    fireEvent.click(comenzar());
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    expect(screen.getByRole('timer')).toHaveTextContent('01:30');
  });

  it('no deja configurar un límite de cero minutos', async () => {
    // Number('') daba 0 y el test terminaba apenas arrancaba.
    const user = userEvent.setup();
    render(<TestApp materias={[materiaChica]} />);

    await user.click(screen.getByRole('checkbox', { name: /límite de tiempo/i }));
    const minutos = screen.getByLabelText(/minutos del límite/i) as HTMLInputElement;
    await user.clear(minutos);

    expect(Number(minutos.value)).toBeGreaterThanOrEqual(1);
  });
});
