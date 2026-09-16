'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Pregunta } from '../types';
import { esMultiple, formatearTiempo, preguntaKey } from '../lib/quiz';
import { BarraProgreso, Boton, Card, cn } from './ui';

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
  const [mostrarIndice, setMostrarIndice] = useState(false);
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

  return (
    <div className="space-y-6">
      {/* Barra fija: progreso, tiempo y envío siempre a mano, sin scrollear 30 preguntas. */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-500">
              {materiaNombre} <span aria-hidden>·</span> Parcial {parcial}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">
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
                'text-xl font-semibold tabular-nums transition-colors sm:text-2xl',
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

        {/* La barra ocupa todo el ancho: en mobile, comprimida al lado del timer, no se leía. */}
        <div className="mt-2.5">
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

      {/* Índice de preguntas: la forma directa de no saltearse ninguna. */}
      <Card className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMostrarIndice((valor) => !valor)}
            aria-expanded={mostrarIndice}
            className="-my-1 flex items-center gap-2 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            <span aria-hidden className={cn('transition-transform', mostrarIndice && 'rotate-90')}>
              ›
            </span>
            Índice de preguntas
          </button>
          {sinResponder.length > 0 && (
            <Boton
              variante="fantasma"
              tamano="sm"
              onClick={() => irAPregunta(preguntaKey(sinResponder[0]))}
            >
              Ir a la primera sin responder
            </Boton>
          )}
        </div>

        {mostrarIndice && (
          <ul className="flex flex-wrap gap-1.5">
            {preguntas.map((pregunta, indice) => {
              const clave = preguntaKey(pregunta);
              const respondida = (selecciones[clave] ?? []).length > 0;
              return (
                <li key={clave}>
                  <button
                    type="button"
                    onClick={() => irAPregunta(clave)}
                    aria-label={`Ir a la pregunta ${indice + 1}, ${respondida ? 'respondida' : 'sin responder'}`}
                    className={cn(
                      'h-9 w-9 rounded-lg border text-sm font-medium tabular-nums transition',
                      respondida
                        ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25'
                        : 'border-slate-700 bg-slate-950/60 text-slate-500 hover:border-amber-400/60 hover:text-amber-300',
                    )}
                  >
                    {indice + 1}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ol className="space-y-5">
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
                tabIndex={-1}
                onFocus={() => onFocoPregunta(clave)}
                onClick={() => onFocoPregunta(clave)}
                className={cn(
                  'rounded-2xl border p-5 outline-none transition-colors',
                  respondida
                    ? 'border-slate-800/80 bg-slate-900/60'
                    : 'border-amber-500/25 bg-slate-900/60',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
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
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                      respondida ? 'bg-cyan-400/15 text-cyan-300' : 'bg-amber-400/15 text-amber-300',
                    )}
                  >
                    {respondida ? 'Respondida' : 'Sin responder'}
                  </span>
                </div>

                {pregunta.imagen && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pregunta.imagen}
                      alt={`Diagrama de la pregunta ${indice + 1}`}
                      className="mx-auto max-h-96 w-full rounded-lg object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                <fieldset className="mt-5">
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
                            'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition',
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
                            className="mt-0.5 h-4 w-4 shrink-0 border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
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

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          {sinResponder.length === 0
            ? 'Respondiste todas las preguntas. Podés enviar cuando quieras.'
            : `Te faltan ${sinResponder.length} ${sinResponder.length === 1 ? 'pregunta' : 'preguntas'} por responder.`}
        </p>
        <div className="flex gap-3">
          <Boton variante="fantasma" onClick={onAbandonar}>
            Abandonar
          </Boton>
          <Boton tamano="lg" onClick={intentarEnviar}>
            Enviar respuestas
          </Boton>
        </div>
      </Card>

      {confirmando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <h2 id="titulo-confirmar" className="text-lg font-semibold text-white">
              Te faltan {sinResponder.length} {sinResponder.length === 1 ? 'pregunta' : 'preguntas'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Las preguntas sin responder cuentan como 0. ¿Querés enviar igual?
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
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
                      className="h-8 w-8 rounded-lg border border-amber-400/40 bg-amber-400/10 text-sm tabular-nums text-amber-200 transition hover:bg-amber-400/20"
                    >
                      {numero}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
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
