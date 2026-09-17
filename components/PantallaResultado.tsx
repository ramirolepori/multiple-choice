'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Pregunta } from '../types';
import {
  PUNTAJE_MAXIMO,
  estadoPregunta,
  formatearTiempo,
  preguntaKey,
  type EstadoPregunta,
  type ResumenTest,
} from '../lib/quiz';
import { Boton, Card, ImagenAmpliable, Metrica, TiraDeMetricas, cn, prefiereMenosMovimiento } from './ui';

type Filtro = 'todas' | 'repasar' | 'correctas';

const etiquetasEstado: Record<EstadoPregunta, string> = {
  correcta: 'Correcta',
  parcial: 'Parcialmente correcta',
  incorrecta: 'Incorrecta',
  'sin-responder': 'Sin responder',
};

const tonosEstado: Record<EstadoPregunta, string> = {
  correcta: 'bg-emerald-400/15 text-emerald-300',
  parcial: 'bg-amber-400/15 text-amber-300',
  incorrecta: 'bg-rose-400/15 text-rose-300',
  'sin-responder': 'bg-slate-700/50 text-slate-400',
};

/*
 * El repaso se recorre scrolleando, no leyendo: todas las tarjetas eran iguales
 * y había que frenar en cada una a leer la etiqueta para saber si esa pregunta
 * te importaba. La raya del costado dice lo mismo de un vistazo.
 */
const rayasEstado: Record<EstadoPregunta, string> = {
  correcta: 'border-l-emerald-500/70',
  parcial: 'border-l-amber-400/70',
  incorrecta: 'border-l-rose-500/70',
  'sin-responder': 'border-l-contorno',
};

function tonoPorNota(porcentaje: number) {
  if (porcentaje >= 80) return { texto: 'text-emerald-300', trazo: 'stroke-emerald-400' };
  if (porcentaje >= 60) return { texto: 'text-cyan-300', trazo: 'stroke-cyan-400' };
  if (porcentaje >= 40) return { texto: 'text-amber-300', trazo: 'stroke-amber-400' };
  return { texto: 'text-rose-300', trazo: 'stroke-rose-400' };
}

function Anillo({ porcentaje, children }: { porcentaje: number; children: React.ReactNode }) {
  const radio = 52;
  const circunferencia = 2 * Math.PI * radio;
  const avance = Math.min(100, Math.max(0, porcentaje));
  const tono = tonoPorNota(avance);

  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center sm:h-32 sm:w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={radio} fill="none" strokeWidth="10" className="stroke-slate-800" />
        <circle
          cx="60"
          cy="60"
          r={radio}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - avance / 100)}
          className={cn('transition-[stroke-dashoffset] duration-1000', tono.trazo)}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">{children}</div>
    </div>
  );
}

export type PantallaResultadoProps = {
  nombre: string;
  materiaNombre: string;
  parcial: number;
  preguntas: Pregunta[];
  selecciones: Record<string, string[]>;
  tiempos: Record<string, number>;
  resumen: ResumenTest;
  tiempoTotal: number;
  onRepetir: () => void;
  onNuevoTest: () => void;
  onVolver: () => void;
};

export default function PantallaResultado({
  nombre,
  materiaNombre,
  parcial,
  preguntas,
  selecciones,
  tiempos,
  resumen,
  tiempoTotal,
  onRepetir,
  onNuevoTest,
  onVolver,
}: PantallaResultadoProps) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [lejosDelPrincipio, setLejosDelPrincipio] = useState(false);
  const [pieALaVista, setPieALaVista] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);

  /*
   * Revisar 30 preguntas deja las acciones (repetir, nuevo test) a una pantallada
   * larguísima de scroll hacia arriba. Se repiten al final del repaso y, además,
   * aparece un botón flotante apenas te alejás del principio.
   */
  const volverArriba = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' });
    }
    // El scroll solo no alcanza: con teclado o lector de pantalla el foco se
    // queda abajo y seguís leyendo desde la última pregunta.
    tituloRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const alScrollear = () => setLejosDelPrincipio(window.scrollY > 600);
    alScrollear();
    window.addEventListener('scroll', alScrollear, { passive: true });
    return () => window.removeEventListener('scroll', alScrollear);
  }, []);

  // Llegando al final el botón flotante sobra y encima tapa "Nuevo test".
  useEffect(() => {
    const nodo = pieRef.current;
    if (!nodo || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(([entrada]) => setPieALaVista(entrada.isIntersecting));
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const estados = useMemo(() => {
    const mapa = new Map<string, EstadoPregunta>();
    preguntas.forEach((pregunta) => {
      const clave = preguntaKey(pregunta);
      mapa.set(clave, estadoPregunta(pregunta, selecciones[clave] ?? []));
    });
    return mapa;
  }, [preguntas, selecciones]);

  const paraRepasar = resumen.parciales + resumen.incorrectas + resumen.sinResponder;

  const visibles = useMemo(() => {
    if (filtro === 'todas') return preguntas;
    return preguntas.filter((pregunta) => {
      const estado = estados.get(preguntaKey(pregunta));
      return filtro === 'correctas' ? estado === 'correcta' : estado !== 'correcta';
    });
  }, [preguntas, estados, filtro]);

  const tono = tonoPorNota(resumen.porcentaje);

  /*
   * Las mismas tres acciones arriba y al final. Arriba son una barra compacta al
   * lado de los filtros; al final son el "¿y ahora?" de la pantalla, así que en
   * celular ocupan el ancho completo y quedan en un orden fijo, con la acción
   * principal abajo de todo, donde cae el pulgar.
   */
  const acciones = (clase?: string) => (
    <>
      <Boton variante="fantasma" onClick={onVolver} className={clase}>
        Cambiar configuración
      </Boton>
      <Boton variante="secundario" onClick={onRepetir} className={clase}>
        Repetir estas preguntas
      </Boton>
      <Boton onClick={onNuevoTest} className={clase}>
        Nuevo test
      </Boton>
    </>
  );

  const filtros: { id: Filtro; texto: string; cantidad: number }[] = [
    { id: 'todas', texto: 'Todas', cantidad: preguntas.length },
    { id: 'repasar', texto: 'Para repasar', cantidad: paraRepasar },
    { id: 'correctas', texto: 'Correctas', cantidad: resumen.correctas },
  ];

  return (
    <div className="space-y-6">
      {/*
       * La nota y el detalle van uno al lado del otro también en celular: en
       * columna y centrados se comían la primera pantalla entera y el repaso
       * —que es a lo que viniste— arrancaba fuera de cuadro.
       */}
      <Card className="space-y-5 border-contorno bg-slate-900/80 p-5 sm:p-7">
        <div className="flex items-center gap-4 sm:gap-6">
          <Anillo porcentaje={resumen.porcentaje}>
            <span className={cn('text-2xl font-bold tabular-nums sm:text-3xl', tono.texto)}>
              {resumen.puntaje}
            </span>
            <span className="text-[11px] text-tenue sm:text-xs">de {PUNTAJE_MAXIMO}</span>
          </Anillo>

          <div className="min-w-0 flex-1">
            {/* Destino del foco al llegar a esta pantalla: lo primero que se
                anuncia es la nota, no el principio del documento. */}
            <h2
              ref={tituloRef}
              data-foco-pantalla
              tabIndex={-1}
              className="text-balance text-2xl font-semibold text-white sm:text-3xl"
            >
              {nombre ? `${nombre}, sacaste ` : 'Sacaste '}
              <span className={tono.texto}>{resumen.porcentaje}%</span>
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              {materiaNombre} <span aria-hidden>·</span> Parcial {parcial} <span aria-hidden>·</span>{' '}
              {preguntas.length} preguntas <span aria-hidden>·</span> {formatearTiempo(tiempoTotal)}
            </p>
          </div>
        </div>

        <TiraDeMetricas>
          <Metrica
            etiqueta="Correctas"
            valor={resumen.correctas}
            tono="ok"
            atenuada={resumen.correctas === 0}
          />
          <Metrica
            etiqueta="Parciales"
            valor={resumen.parciales}
            tono="alerta"
            atenuada={resumen.parciales === 0}
          />
          <Metrica
            etiqueta="Incorrectas"
            valor={resumen.incorrectas}
            tono="error"
            atenuada={resumen.incorrectas === 0}
          />
          <Metrica
            etiqueta="Sin responder"
            valor={resumen.sinResponder}
            atenuada={resumen.sinResponder === 0}
          />
        </TiraDeMetricas>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filtrar preguntas" className="flex flex-wrap gap-2">
          {filtros.map(({ id, texto, cantidad }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm transition',
                filtro === id
                  ? 'border-cyan-400/70 bg-cyan-400/10 text-cyan-200'
                  : 'border-contorno bg-slate-950/50 text-slate-400 hover:border-slate-500 hover:text-slate-200',
              )}
            >
              {/* `opacity-60` dejaba el contador en 3.39:1; el tono explícito llega a 5.4:1. */}
              {texto}{' '}
              <span className={cn('tabular-nums', filtro === id ? 'text-cyan-300' : 'text-tenue')}>
                {cantidad}
              </span>
            </button>
          ))}
        </div>

        <div role="group" aria-label="Acciones del resultado" className="flex flex-wrap gap-2">
          {acciones()}
        </div>
      </div>

      {/* Cambiar de filtro reemplazaba la lista en silencio: nada anunciaba
          cuántas preguntas quedaban, ni que el filtro no tenía ninguna. */}
      <p role="status" className="sr-only">
        {/* El nombre del filtro va incluido a propósito: sin él, pasar de un
            filtro a otro con el mismo conteo dejaba el texto igual y la región
            live no anunciaba nada aunque la lista hubiera cambiado. */}
        {`${filtros.find((item) => item.id === filtro)?.texto ?? 'Todas'}: `}
        {visibles.length === 0
          ? 'no hay preguntas en este filtro.'
          : `mostrando ${visibles.length} de ${preguntas.length} preguntas.`}
      </p>

      {visibles.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-400">
          No hay preguntas en este filtro.
        </Card>
      ) : (
        <ol className="space-y-4">
          {visibles.map((pregunta) => {
            const clave = preguntaKey(pregunta);
            const seleccion = selecciones[clave] ?? [];
            const estado = estados.get(clave) ?? 'sin-responder';
            const numero = preguntas.indexOf(pregunta) + 1;
            const segundos = tiempos[clave] ?? 0;

            return (
              <li key={clave}>
                <article
                  className={cn(
                    'rounded-2xl border border-l-4 border-slate-800/80 bg-slate-900/60 p-5',
                    rayasEstado[estado],
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-tenue">
                          Pregunta {numero}
                        </span>
                        <span
                          className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tonosEstado[estado])}
                        >
                          {etiquetasEstado[estado]}
                        </span>
                        {segundos > 0 && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                            {formatearTiempo(segundos)} de lectura
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 break-words text-base font-semibold leading-relaxed text-white sm:text-lg">
                        {pregunta.texto}
                      </h3>
                    </div>
                  </div>

                  {pregunta.imagen && (
                    <div className="mt-4">
                      <ImagenAmpliable src={pregunta.imagen} alt={`Diagrama de la pregunta ${numero}`} />
                    </div>
                  )}

                  <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {pregunta.respuestas.map((respuesta) => {
                      const elegida = seleccion.includes(respuesta.id);
                      const acierto = respuesta.correcta && elegida;
                      const fallo = !respuesta.correcta && elegida;
                      const faltante = respuesta.correcta && !elegida;
                      const veredicto = acierto
                        ? 'La marcaste y es correcta'
                        : faltante
                          ? 'Correcta, no la marcaste'
                          : fallo
                            ? 'La marcaste y es incorrecta'
                            : null;

                      return (
                        <li
                          key={respuesta.id}
                          className={cn(
                            'min-w-0 rounded-xl border p-3.5',
                            acierto && 'border-emerald-500/60 bg-emerald-500/10',
                            faltante && 'border-emerald-500/30 bg-emerald-500/5',
                            fallo && 'border-rose-500/60 bg-rose-500/10',
                            !respuesta.correcta && !elegida && 'border-contorno/70 bg-slate-950/40',
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              aria-hidden
                              className={cn(
                                'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs font-bold',
                                // El acierto va macizo y la que se te pasó, contorneada:
                                // antes las dos mostraban el mismo ✓ verde.
                                acierto
                                  ? 'bg-emerald-500/25 text-emerald-300'
                                  : faltante
                                    ? 'border border-emerald-400/70 text-emerald-300'
                                    : fallo
                                      ? 'bg-rose-500/25 text-rose-300'
                                      : 'bg-slate-800 text-slate-300',
                              )}
                            >
                              {respuesta.correcta ? '✓' : fallo ? '✕' : respuesta.id.toUpperCase()}
                            </span>
                            <span className="min-w-0 break-words text-sm leading-relaxed text-slate-200">
                              {respuesta.texto}
                            </span>
                          </div>
                          {/* Es el único portador textual de "¿la acerté?": iba en el
                              tono más tenue de la app, a 4.51:1. */}
                          {veredicto && (
                            <p className="mt-1.5 pl-[1.9rem] text-xs text-slate-300">{veredicto}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {pregunta.explicacion && (
                    <div className="mt-4 rounded-xl border-l-2 border-cyan-400/50 bg-slate-950/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Explicación</p>
                      <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-300">
                        {pregunta.explicacion}
                      </p>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {/* Cierre del repaso: las acciones de arriba otra vez, sin volver a subir. */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200">Fin del repaso</p>
          <p className="mt-0.5 text-xs text-tenue">
            {visibles.length === preguntas.length
              ? `Revisaste las ${preguntas.length} preguntas.`
              : `Estás viendo ${visibles.length} de ${preguntas.length} preguntas.`}
          </p>
        </div>
        <div
          ref={pieRef}
          role="group"
          aria-label="Acciones al final del repaso"
          className="grid gap-2 sm:flex sm:flex-wrap"
        >
          <Boton variante="fantasma" onClick={volverArriba} className="w-full sm:w-auto">
            <span aria-hidden>↑</span> Volver arriba
          </Boton>
          {acciones('w-full sm:w-auto')}
        </div>
      </Card>

      {/* Atajo para el medio de la lista, donde ni el principio ni el final están a mano. */}
      {lejosDelPrincipio && !pieALaVista && (
        <Boton
          variante="secundario"
          onClick={volverArriba}
          aria-label="Volver arriba"
          className="fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full border border-contorno p-0 text-lg shadow-xl shadow-slate-950/50 mb-[env(safe-area-inset-bottom)]"
        >
          <span aria-hidden>↑</span>
        </Boton>
      )}
    </div>
  );
}
