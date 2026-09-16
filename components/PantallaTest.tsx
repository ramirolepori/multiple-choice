'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Pregunta } from '../types';
import { esMultiple, formatearTiempo, preguntaKey } from '../lib/quiz';
import { BarraProgreso, Boton, Card, ImagenAmpliable, cn } from './ui';

function prefiereMenosMovimiento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function anclaDe(clave: string): string {
  return `pregunta-${clave}`;
}

export type PantallaTestProps = {
  materiaNombre: string;
  parcial: number;
  preguntas: Pregunta[];
  selecciones: Record<string, string[]>;
  onToggleRespuesta: (preguntaId: string, respuestaId: string, multiple: boolean) => void;
  onLimpiarRespuesta: (preguntaId: string) => void;
  onFocoPregunta: (preguntaId: string) => void;
  usarLimite: boolean;
  segundosRestantes: number | null;
  segundosTranscurridos: number;
  onEnviar: () => void;
  onAbandonar: () => void;
};

export default function PantallaTest({
  materiaNombre,
  parcial,
  preguntas,
  selecciones,
  onToggleRespuesta,
  onLimpiarRespuesta,
  onFocoPregunta,
  usarLimite,
  segundosRestantes,
  segundosTranscurridos,
  onEnviar,
  onAbandonar,
}: PantallaTestProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [indiceAbierto, setIndiceAbierto] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  const sinResponder = useMemo(
    () => preguntas.filter((pregunta) => (selecciones[preguntaKey(pregunta)] ?? []).length === 0),
    [preguntas, selecciones],
  );
  const respondidas = preguntas.length - sinResponder.length;

  const irAPregunta = useCallback((clave: string) => {
    const nodo = document.getElementById(anclaDe(clave));
    if (!nodo) return;
    nodo.scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth', block: 'start' });
    nodo.focus({ preventScroll: true });
  }, []);

  const irAIndice = useCallback(
    (indice: number) => {
      const destino = preguntas[indice];
      if (destino) irAPregunta(preguntaKey(destino));
    },
    [preguntas, irAPregunta],
  );

  /*
   * Sigue qué pregunta está en pantalla para la barra inferior. El margen recorta
   * el viewport a su franja central, así la "actual" es la que estás mirando y no
   * cualquiera que asome por el borde.
   */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const nodos = Array.from(document.querySelectorAll<HTMLElement>('[data-indice-pregunta]'));
    if (!nodos.length) return;

    const visibles = new Set<number>();
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          const indice = Number((entrada.target as HTMLElement).dataset.indicePregunta);
          if (entrada.isIntersecting) visibles.add(indice);
          else visibles.delete(indice);
        });
        if (visibles.size) setPreguntaActual(Math.min(...visibles));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );

    nodos.forEach((nodo) => observador.observe(nodo));
    return () => observador.disconnect();
  }, [preguntas]);

  const intentarEnviar = () => {
    if (sinResponder.length > 0) {
      setConfirmando(true);
      return;
    }
    onEnviar();
  };

  // Escape cierra el diálogo y el foco arranca en la acción principal.
  useEffect(() => {
    if (!confirmando) return;
    confirmarRef.current?.focus();
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setConfirmando(false);
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [confirmando]);

  useEffect(() => {
    if (!indiceAbierto) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setIndiceAbierto(false);
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [indiceAbierto]);

  // Evita perder un test a medias por un refresh o un cierre accidental.
  useEffect(() => {
    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, []);

  const apremiante = usarLimite && segundosRestantes !== null && segundosRestantes <= 60;
  const tiempo = usarLimite ? formatearTiempo(segundosRestantes ?? 0) : formatearTiempo(segundosTranscurridos);

  const grillaIndice = (
    <ul className="flex flex-wrap gap-2">
      {preguntas.map((pregunta, indice) => {
        const clave = preguntaKey(pregunta);
        const respondida = (selecciones[clave] ?? []).length > 0;
        return (
          <li key={clave}>
            <button
              type="button"
              onClick={() => {
                setIndiceAbierto(false);
                irAPregunta(clave);
              }}
              aria-label={`Ir a la pregunta ${indice + 1}, ${respondida ? 'respondida' : 'sin responder'}`}
              className={cn(
                'h-11 w-11 rounded-xl border text-sm font-medium tabular-nums transition',
                respondida
                  ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                  : 'border-slate-700 bg-slate-950/60 text-slate-500',
                indice === preguntaActual && 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-900',
              )}
            >
              {indice + 1}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    // El padding inferior deja lugar para la barra fija del pulgar en celular.
    <div className="space-y-5 pb-28 sm:pb-0">
      {/* Barra superior: progreso y tiempo siempre visibles, sin scrollear 30 preguntas. */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-slate-800/80 bg-slate-950/90 px-4 py-2.5 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {materiaNombre} <span aria-hidden>·</span> Parcial {parcial}
            </p>
            <p className="text-sm font-semibold tabular-nums text-white sm:mt-0.5">
              {respondidas} de {preguntas.length} respondidas
              {sinResponder.length > 0 && (
                <span className="ml-2 hidden font-normal text-amber-300 sm:inline">
                  ({sinResponder.length} sin responder)
                </span>
              )}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-500">{usarLimite ? 'Restante' : 'Tiempo'}</p>
            <p
              role="timer"
              aria-label={`${usarLimite ? 'Tiempo restante' : 'Tiempo transcurrido'}: ${tiempo}`}
              className={cn(
                'text-lg font-semibold tabular-nums leading-tight transition-colors sm:text-2xl',
                apremiante ? 'text-rose-400' : 'text-cyan-300',
              )}
            >
              {tiempo}
            </p>
          </div>

          <Boton onClick={intentarEnviar} className="shrink-0">
            Enviar
          </Boton>
        </div>

        <div className="mt-2">
          <BarraProgreso
            valor={respondidas}
            maximo={preguntas.length}
            etiqueta="Preguntas respondidas"
            tono={sinResponder.length === 0 ? 'ok' : 'acento'}
          />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {apremiante ? `Queda menos de un minuto: ${tiempo}` : ''}
      </p>

      {/* En escritorio el índice vive inline; en celular se abre desde la barra inferior. */}
      <Card className="hidden space-y-3 sm:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-300">Índice de preguntas</p>
          {sinResponder.length > 0 && (
            <Boton variante="fantasma" tamano="sm" onClick={() => irAPregunta(preguntaKey(sinResponder[0]))}>
              Ir a la primera sin responder
            </Boton>
          )}
        </div>
        {grillaIndice}
      </Card>

      <ol className="space-y-4 sm:space-y-5">
        {preguntas.map((pregunta, indice) => {
          const clave = preguntaKey(pregunta);
          const seleccion = selecciones[clave] ?? [];
          const multiple = esMultiple(pregunta);
          const respondida = seleccion.length > 0;

          return (
            <li key={clave}>
              <article
                id={anclaDe(clave)}
                data-ancla-pregunta
                data-indice-pregunta={indice}
                tabIndex={-1}
                onFocus={() => onFocoPregunta(clave)}
                onClick={() => onFocoPregunta(clave)}
                className={cn(
                  'rounded-2xl border p-4 outline-none transition-colors sm:p-5',
                  respondida ? 'border-slate-800/80 bg-slate-900/60' : 'border-amber-500/25 bg-slate-900/60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Pregunta {indice + 1} de {preguntas.length}
                      </span>
                      {multiple && (
                        <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                          Varias correctas
                        </span>
                      )}
                      {pregunta.tema && (
                        <span className="hidden rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 sm:inline">
                          {pregunta.tema}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-semibold leading-relaxed text-white sm:text-lg">
                      {pregunta.texto}
                    </h2>
                  </div>

                  <span
                    className={cn(
                      'mt-0.5 shrink-0 rounded-full px-2 py-1 text-[11px] font-medium',
                      respondida ? 'bg-cyan-400/15 text-cyan-300' : 'bg-amber-400/15 text-amber-300',
                    )}
                  >
                    {respondida ? 'Respondida' : 'Sin responder'}
                  </span>
                </div>

                {pregunta.imagen && (
                  <div className="mt-4">
                    <ImagenAmpliable src={pregunta.imagen} alt={`Diagrama de la pregunta ${indice + 1}`} />
                  </div>
                )}

                <fieldset className="mt-4 sm:mt-5">
                  <legend className="sr-only">
                    {multiple ? 'Elegí todas las opciones correctas' : 'Elegí una opción'}
                  </legend>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {pregunta.respuestas.map((respuesta) => {
                      const elegida = seleccion.includes(respuesta.id);
                      return (
                        <label
                          key={respuesta.id}
                          className={cn(
                            'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition',
                            elegida
                              ? 'border-cyan-400/70 bg-cyan-400/10'
                              : 'border-slate-700/70 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/60',
                          )}
                        >
                          <input
                            type={multiple ? 'checkbox' : 'radio'}
                            name={`pregunta-${clave}`}
                            checked={elegida}
                            onChange={() => onToggleRespuesta(clave, respuesta.id, multiple)}
                            className="h-5 w-5 shrink-0 border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                          />
                          <span className="text-sm leading-relaxed text-slate-100">{respuesta.texto}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {respondida && (
                  <div className="mt-3 flex justify-end">
                    <Boton variante="fantasma" tamano="sm" onClick={() => onLimpiarRespuesta(clave)}>
                      Limpiar respuesta
                    </Boton>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          {sinResponder.length === 0
            ? 'Respondiste todas las preguntas. Podés enviar cuando quieras.'
            : `Te faltan ${sinResponder.length} ${sinResponder.length === 1 ? 'pregunta' : 'preguntas'} por responder.`}
        </p>
        <div className="flex gap-3">
          <Boton variante="fantasma" onClick={onAbandonar}>
            Abandonar
          </Boton>
          <Boton tamano="lg" onClick={intentarEnviar} className="flex-1 sm:flex-none">
            Enviar respuestas
          </Boton>
        </div>
      </Card>

      {/* Barra inferior solo en celular: avanzar de a una pregunta sin estirar el pulgar hasta arriba. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <Boton
            variante="fantasma"
            onClick={() => irAIndice(preguntaActual - 1)}
            disabled={preguntaActual === 0}
            aria-label="Pregunta anterior"
            className="w-12 px-0 text-lg"
          >
            <span aria-hidden>‹</span>
          </Boton>

          <button
            type="button"
            onClick={() => setIndiceAbierto(true)}
            aria-haspopup="dialog"
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1"
          >
            <span className="text-sm font-semibold tabular-nums text-white">
              Pregunta {preguntaActual + 1} de {preguntas.length}
            </span>
            <span className="text-[11px] text-slate-500">Tocá para ver el índice</span>
          </button>

          <Boton
            variante="fantasma"
            onClick={() => irAIndice(preguntaActual + 1)}
            disabled={preguntaActual >= preguntas.length - 1}
            aria-label="Pregunta siguiente"
            className="w-12 px-0 text-lg"
          >
            <span aria-hidden>›</span>
          </Boton>
        </div>
      </div>

      {indiceAbierto && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0 bg-slate-950/75"
            onClick={() => setIndiceAbierto(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Índice de preguntas"
            className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Índice de preguntas</h2>
              <Boton variante="fantasma" tamano="sm" onClick={() => setIndiceAbierto(false)} autoFocus>
                Cerrar
              </Boton>
            </div>

            {sinResponder.length > 0 && (
              <Boton
                variante="secundario"
                onClick={() => {
                  setIndiceAbierto(false);
                  irAPregunta(preguntaKey(sinResponder[0]));
                }}
                className="mb-4 w-full"
              >
                Ir a la primera sin responder
              </Boton>
            )}

            {grillaIndice}
          </div>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6"
          >
            <h2 id="titulo-confirmar" className="text-lg font-semibold text-white">
              Te faltan {sinResponder.length} {sinResponder.length === 1 ? 'pregunta' : 'preguntas'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Las preguntas sin responder cuentan como 0. ¿Querés enviar igual?
            </p>
            <ul className="mt-4 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {sinResponder.map((pregunta) => {
                const numero = preguntas.indexOf(pregunta) + 1;
                return (
                  <li key={preguntaKey(pregunta)}>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmando(false);
                        irAPregunta(preguntaKey(pregunta));
                      }}
                      aria-label={`Ir a la pregunta ${numero}`}
                      className="h-11 w-11 rounded-xl border border-amber-400/40 bg-amber-400/10 text-sm tabular-nums text-amber-200 transition hover:bg-amber-400/20"
                    >
                      {numero}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <Boton
                ref={confirmarRef}
                variante="secundario"
                onClick={() => {
                  setConfirmando(false);
                  onEnviar();
                }}
              >
                Enviar igual
              </Boton>
              <Boton variante="fantasma" onClick={() => setConfirmando(false)}>
                Seguir respondiendo
              </Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
