'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { materias } from '../lib/materias';
import type { Materia, Pregunta, RespuestaSeleccion } from '../types';

const cantidadOpciones = [10, 20, 30];
const totalTestMax = 10;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function calcularPuntaje(pregunta: Pregunta, seleccion: string[], totalPreguntas: number) {
  const correctas = pregunta.respuestas.filter((r) => r.correcta).map((r) => r.id);
  const valorPregunta = totalPreguntas ? totalTestMax / totalPreguntas : 0;
  const valorPorRespuesta = valorPregunta / Math.max(correctas.length, 1);
  const ganancia = seleccion.filter((id) => correctas.includes(id)).length * valorPorRespuesta;
  const resta = seleccion.filter((id) => !correctas.includes(id)).length * valorPorRespuesta;
  return Math.max(0, ganancia - resta);
}

export default function HomePage() {
  const [nombre, setNombre] = useState('');
  const [materiaId, setMateriaId] = useState(materias[0]?.materia ?? '');
  const [cantidad, setCantidad] = useState(10);
  const [usarLimite, setUsarLimite] = useState(false);
  const [limiteMinutos, setLimiteMinutos] = useState(15);
  const [fase, setFase] = useState<'inicio' | 'test' | 'resultado'>('inicio');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({});
  const [puntajes, setPuntajes] = useState<Record<string, number>>({});
  const [tiempos, setTiempos] = useState<Record<string, number>>({});
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const [tiempoInicio, setTiempoInicio] = useState<number | null>(null);
  const [resultado, setResultado] = useState({ total: 0, maximo: 0, porcentaje: 0, tiempoTotal: 0 });
  const [activePregunta, setActivePregunta] = useState<string | null>(null);
  const ultimoCambioRef = useRef<number>(0);

  const materia = useMemo(() => materias.find((m) => m.materia === materiaId) ?? materias[0], [materiaId]);
  const opcionesCantidad = useMemo(
    () => cantidadOpciones.filter((valor) => valor <= materia.preguntas.length),
    [materia],
  );

  useEffect(() => {
    if (fase !== 'test') return;
    const interval = setInterval(() => {
      if (usarLimite) {
        setSegundosRestantes((actual) => {
          if (actual === null || actual <= 1) {
            clearInterval(interval);
            onEnviar();
            return 0;
          }
          return actual - 1;
        });
      } else {
        setSegundosTranscurridos((actual) => actual + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fase, usarLimite]);

  useEffect(() => {
    if (!fase || !activePregunta || !tiempoInicio) return;
    ultimoCambioRef.current = Date.now();
  }, [activePregunta, fase, tiempoInicio]);

  const iniciarTest = () => {
    const seleccionadas = shuffle(materia.preguntas).slice(0, cantidad);
    const inicial = Object.fromEntries(seleccionadas.map((pregunta) => [pregunta.id.toString(), [] as string[]]));
    setPreguntas(seleccionadas);
    setSelecciones(inicial);
    setPuntajes({});
    setTiempos({});
    setSegundosRestantes(usarLimite ? limiteMinutos * 60 : null);
    setSegundosTranscurridos(0);
    setTiempoInicio(Date.now());
    setFase('test');
    setActivePregunta(seleccionadas[0]?.id.toString() ?? null);
    ultimoCambioRef.current = Date.now();
  };

  const registrarInteraccion = (preguntaId: string) => {
    const ahora = Date.now();
    if (activePregunta && activePregunta !== preguntaId) {
      const delta = Math.round((ahora - ultimoCambioRef.current) / 1000);
      setTiempos((actual) => ({
        ...actual,
        [activePregunta]: (actual[activePregunta] ?? 0) + delta,
      }));
    }
    setActivePregunta(preguntaId);
    ultimoCambioRef.current = ahora;
  };

  const onToggleRespuesta = (preguntaId: string, respuestaId: string) => {
    registrarInteraccion(preguntaId);
    setSelecciones((actual) => {
      const seleccion = actual[preguntaId] ?? [];
      const tiene = seleccion.includes(respuestaId);
      return {
        ...actual,
        [preguntaId]: tiene ? seleccion.filter((id) => id !== respuestaId) : [...seleccion, respuestaId],
      };
    });
  };

  const onEnviar = () => {
    if (fase !== 'test') return;
    const ahora = Date.now();
    if (activePregunta) {
      const delta = Math.round((ahora - ultimoCambioRef.current) / 1000);
      setTiempos((actual) => ({
        ...actual,
        [activePregunta]: (actual[activePregunta] ?? 0) + delta,
      }));
    }
    const puntajeTotal = preguntas.reduce((acum, pregunta) => {
      const seleccion = selecciones[pregunta.id.toString()] ?? [];
      const puntaje = calcularPuntaje(pregunta, seleccion, preguntas.length);
      return acum + puntaje;
    }, 0);
    const maximo = preguntas.length ? totalTestMax : 0;
    const tiempoTotal = Math.round((ahora - (tiempoInicio ?? ahora)) / 1000);
    setPuntajes(Object.fromEntries(preguntas.map((pregunta) => [pregunta.id.toString(), calcularPuntaje(pregunta, selecciones[pregunta.id.toString()] ?? [], preguntas.length)])));
    setResultado({
      total: Number(puntajeTotal.toFixed(2)),
      maximo,
      porcentaje: maximo ? Number(((puntajeTotal / maximo) * 100).toFixed(1)) : 0,
      tiempoTotal,
    });
    setFase('resultado');
  };

  const reiniciar = () => {
    setFase('inicio');
    setSelecciones({});
    setPuntajes({});
    setTiempos({});
    setResultado({ total: 0, maximo: 0, porcentaje: 0, tiempoTotal: 0 });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-10">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-slate-900/30 backdrop-blur-xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">multiple choice</p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Plataforma de estudio rápido</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Elige materia, cantidad de preguntas y tiempo límite. Responde el test, revisa tus aciertos y el detalle de cada pregunta.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4 text-slate-300 shadow-lg shadow-slate-950/20">
            <p className="text-sm uppercase tracking-wide text-cyan-300">Sesión</p>
            <p className="mt-1 text-lg font-semibold text-white">{nombre ? `Hola, ${nombre}` : 'Listo para comenzar'}</p>
          </div>
        </header>

        {fase === 'inicio' && (
          <section className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-3">
              <label className="space-y-2 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <span className="text-sm text-slate-400">Tu nombre (solo para la sesión)</span>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej. Laura"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="space-y-2 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <span className="text-sm text-slate-400">Materia</span>
                <select
                  value={materiaId}
                  onChange={(event) => setMateriaId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  {materias.map((m) => (
                    <option key={m.materia} value={m.materia}>{m.materia}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <span className="text-sm text-slate-400">Cant. preguntas</span>
                <select
                  value={cantidad}
                  onChange={(event) => setCantidad(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  {cantidadOpciones.map((valor) => (
                    <option key={valor} value={valor}>{valor} preguntas</option>
                  ))}
                </select>
                {materia.preguntas.length < cantidad && (
                  <p className="text-xs text-amber-300">Esta materia tiene {materia.preguntas.length} preguntas disponibles; selecciona un valor menor.</p>
                )}
              </label>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Usar límite de tiempo</span>
                  <input
                    type="checkbox"
                    checked={usarLimite}
                    onChange={() => setUsarLimite((prev) => !prev)}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                  />
                </div>
                {usarLimite && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={limiteMinutos}
                      onChange={(event) => setLimiteMinutos(Number(event.target.value))}
                      className="w-24 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
                    />
                    <span className="text-slate-400">minutos</span>
                  </div>
                )}
                <p className="text-xs text-slate-500">El tiempo es opcional: si no lo activas, el test solo medirá cuánto tardaste.</p>
              </label>

              <div className="rounded-3xl border border-slate-800 bg-cyan-950/20 p-5 text-slate-100">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Reglas de puntuación</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>El test se escala a 10 puntos, sin importar la cantidad de preguntas.</li>
                  <li>Cada pregunta vale 10 / cantidad de preguntas.</li>
                  <li>Cada respuesta correcta suma y cada incorrecta resta el mismo peso.</li>
                  <li>El puntaje mínimo por pregunta es 0.</li>
                </ul>
              </div>
            </div>

            <button
              disabled={cantidad > materia.preguntas.length}
              onClick={iniciarTest}
              className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Comenzar test
            </button>
          </section>
        )}

        {fase === 'test' && (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-400">Materia</p>
                <p className="text-lg font-semibold text-white">{materia.materia}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm text-slate-400">{usarLimite ? 'Tiempo restante' : 'Tiempo transcurrido'}</p>
                <p className="text-2xl font-semibold text-cyan-300">
                  {usarLimite
                    ? `${Math.floor((segundosRestantes ?? 0) / 60).toString().padStart(2, '0')}:${((segundosRestantes ?? 0) % 60).toString().padStart(2, '0')}`
                    : `${Math.floor(segundosTranscurridos / 60).toString().padStart(2, '0')}:${(segundosTranscurridos % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {preguntas.map((pregunta, index) => {
                const seleccion = selecciones[pregunta.id.toString()] ?? [];
                const tiempo = tiempos[pregunta.id.toString()] ?? 0;
                return (
                  <article
                    key={pregunta.id}
                    onClick={() => registrarInteraccion(pregunta.id.toString())}
                    className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pregunta {index + 1}</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">{pregunta.texto}</h2>
                      </div>
                      <div className="rounded-2xl bg-slate-900 px-3 py-2 text-sm text-slate-300">
                        Tiempo enfocado: {tiempo}s
                      </div>
                    </div>
                    {pregunta.imagen && (
                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                        <img
                          src={pregunta.imagen}
                          alt={`Imagen pregunta ${index + 1}`}
                          className="w-full max-h-80 rounded-3xl object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {pregunta.respuestas.map((respuesta) => (
                        <label
                          key={respuesta.id}
                          className={`group block cursor-pointer rounded-3xl border p-4 transition ${seleccion.includes(respuesta.id) ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-900/80'} hover:border-cyan-400`}
                        >
                          <input
                            type="checkbox"
                            checked={seleccion.includes(respuesta.id)}
                            onChange={() => onToggleRespuesta(pregunta.id.toString(), respuesta.id)}
                            className="mr-3 h-4 w-4 rounded border-slate-500 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                          />
                          <span className="text-sm text-slate-100">{respuesta.texto}</span>
                        </label>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-slate-300">Selecciona las respuestas y luego envía cuando termines.</p>
              <button
                onClick={onEnviar}
                className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Enviar respuestas
              </button>
            </div>
          </section>
        )}

        {fase === 'resultado' && (
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/90">Resultados</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-900/80 p-5">
                  <p className="text-sm text-slate-400">Puntaje</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{resultado.total} / {resultado.maximo}</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5">
                  <p className="text-sm text-slate-400">Porcentaje</p>
                  <p className="mt-2 text-3xl font-semibold text-cyan-300">{resultado.porcentaje}%</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5">
                  <p className="text-sm text-slate-400">Tiempo total</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{Math.floor(resultado.tiempoTotal / 60)}:{(resultado.tiempoTotal % 60).toString().padStart(2, '0')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {preguntas.map((pregunta, index) => {
                const seleccion = selecciones[pregunta.id.toString()] ?? [];
                const puntaje = puntajes[pregunta.id.toString()] ?? 0;
                return (
                  <article key={pregunta.id} className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pregunta {index + 1}</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">{pregunta.texto}</h2>
                      </div>
                      <div className="rounded-2xl bg-slate-900 px-3 py-2 text-sm text-slate-300">
                        Puntaje: {puntaje.toFixed(1)}
                      </div>
                    </div>
                    {pregunta.imagen && (
                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                        <img
                          src={pregunta.imagen}
                          alt={`Imagen pregunta ${index + 1}`}
                          className="w-full max-h-80 rounded-3xl object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {pregunta.respuestas.map((respuesta) => {
                        const esSeleccionada = seleccion.includes(respuesta.id);
                        return (
                          <div
                            key={respuesta.id}
                            className={`rounded-3xl border p-4 ${respuesta.correcta ? 'border-emerald-500/60 bg-emerald-500/10' : esSeleccionada ? 'border-rose-500/60 bg-rose-500/10' : 'border-slate-700 bg-slate-900/80'}`}
                          >
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-semibold text-slate-100">{respuesta.id.toUpperCase()}.</span>
                              <span className="text-slate-200">{respuesta.texto}</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              {respuesta.correcta && 'Correcta'}
                              {esSeleccionada && !respuesta.correcta && 'Seleccionada incorrecta'}
                              {esSeleccionada && respuesta.correcta && 'Seleccionada correcta'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={reiniciar}
                className="inline-flex items-center justify-center rounded-3xl bg-slate-700 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-600"
              >
                Volver al inicio
              </button>
              <p className="max-w-2xl text-sm text-slate-400">El detalle muestra las respuestas correctas y tus elecciones para que repases lo que faltó reforzar.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
