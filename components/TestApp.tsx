'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Materia, Pregunta } from '../types';
import {
  ajustarCantidad,
  contarPorTema,
  filtrarPorTemas,
  opcionesDeCantidad,
  parcialesDe,
  preguntaKey,
  resumenTest,
  shuffle,
} from '../lib/quiz';
import PantallaInicio from './PantallaInicio';
import PantallaResultado from './PantallaResultado';
import PantallaTest from './PantallaTest';
import { Card, cn } from './ui';

type Fase = 'inicio' | 'test' | 'resultado';

const LIMITE_MINIMO = 1;
const LIMITE_MAXIMO = 180;
const CLAVE_NOMBRE = 'multiple-choice:nombre';

/** useLayoutEffect avisa en el render del servidor; en SSR alcanza con useEffect. */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function normalizarMinutos(valor: number, anterior: number): number {
  if (!Number.isFinite(valor)) return anterior;
  return Math.min(LIMITE_MAXIMO, Math.max(LIMITE_MINIMO, Math.round(valor)));
}

interface TestAppProps {
  materias: Materia[];
}

export default function TestApp({ materias }: TestAppProps) {
  const [nombre, setNombre] = useState('');
  const [materiaId, setMateriaId] = useState(materias[0]?.materia ?? '');
  const [parcial, setParcial] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(10);
  const [temasPorSeccion, setTemasPorSeccion] = useState<Record<string, string[]>>({});
  const [usarLimite, setUsarLimite] = useState(false);
  const [limiteMinutos, setLimiteMinutos] = useState(15);

  const [fase, setFase] = useState<Fase>('inicio');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({});
  const [tiempos, setTiempos] = useState<Record<string, number>>({});
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const [tiempoTotal, setTiempoTotal] = useState(0);

  const inicioRef = useRef<number | null>(null);
  const finRef = useRef<number | null>(null);
  const activoRef = useRef<string | null>(null);
  const ultimoCambioRef = useRef<number>(0);

  const materia = useMemo(
    () => materias.find((item) => item.materia === materiaId) ?? materias[0] ?? null,
    [materiaId, materias],
  );

  const parcialesDisponibles = useMemo(() => parcialesDe(materia?.preguntas ?? []), [materia]);

  /*
   * El parcial y la cantidad son valores derivados en lugar de estado sincronizado
   * por efectos: si el valor guardado deja de ser válido (cambió la materia o el
   * filtro de temas) se corrige en el mismo render. Antes el <select> podía mostrar
   * una cantidad y el test generarse con otra.
   */
  const parcialActivo = useMemo(
    () => (parcial !== null && parcialesDisponibles.includes(parcial) ? parcial : (parcialesDisponibles[0] ?? 1)),
    [parcial, parcialesDisponibles],
  );

  const preguntasDelParcial = useMemo(
    () => (materia?.preguntas ?? []).filter((pregunta) => pregunta.parcial === parcialActivo),
    [materia, parcialActivo],
  );

  const temasDisponibles = useMemo(() => contarPorTema(preguntasDelParcial), [preguntasDelParcial]);

  const seccion = `${materia?.materia ?? ''}|${parcialActivo}`;
  const temas = useMemo(
    () => temasPorSeccion[seccion] ?? temasDisponibles.map((item) => item.tema),
    [temasPorSeccion, seccion, temasDisponibles],
  );

  const preguntasFiltradas = useMemo(
    () => filtrarPorTemas(preguntasDelParcial, temas, temasDisponibles.length > 0),
    [preguntasDelParcial, temas, temasDisponibles],
  );

  const opcionesCantidad = useMemo(() => opcionesDeCantidad(preguntasFiltradas.length), [preguntasFiltradas]);
  const cantidadActiva = useMemo(() => ajustarCantidad(cantidad, opcionesCantidad), [cantidad, opcionesCantidad]);

  const minutosValidos = normalizarMinutos(limiteMinutos, 15);
  const limiteSegundos = usarLimite ? minutosValidos * 60 : null;

  const resumen = useMemo(() => resumenTest(preguntas, selecciones), [preguntas, selecciones]);

  // El nombre sobrevive a un refresh; el resto de la configuración no vale la pena guardarla.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_NOMBRE);
      if (guardado) setNombre(guardado);
    } catch {
      /* modo privado o storage bloqueado: seguimos sin persistencia */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_NOMBRE, nombre);
    } catch {
      /* ídem */
    }
  }, [nombre]);

  /*
   * EL bug reportado: al cambiar de pantalla el navegador conservaba el scroll
   * y el test arrancaba a mitad de la lista, con preguntas salteadas sin verlas.
   * 'instant' evita que el scroll-behavior del documento lo deje a mitad de camino.
   */
  useIsoLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [fase]);

  const registrarFoco = useCallback((clave: string) => {
    const ahora = Date.now();
    const previo = activoRef.current;
    if (previo === clave) return;
    if (previo) {
      const delta = Math.round((ahora - ultimoCambioRef.current) / 1000);
      if (delta > 0) {
        setTiempos((actual) => ({ ...actual, [previo]: (actual[previo] ?? 0) + delta }));
      }
    }
    activoRef.current = clave;
    ultimoCambioRef.current = ahora;
  }, []);

  // Espejo de `fase` legible fuera del render, para que finalizar sea idempotente
  // aunque lo disparen a la vez el botón y el vencimiento del tiempo.
  const faseRef = useRef<Fase>(fase);
  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  const finalizar = useCallback(() => {
    if (faseRef.current !== 'test') return;
    faseRef.current = 'resultado';
    const ahora = Date.now();
    const activo = activoRef.current;
    if (activo) {
      const delta = Math.round((ahora - ultimoCambioRef.current) / 1000);
      if (delta > 0) setTiempos((actual) => ({ ...actual, [activo]: (actual[activo] ?? 0) + delta }));
    }
    activoRef.current = null;
    setTiempoTotal(Math.round((ahora - (inicioRef.current ?? ahora)) / 1000));
    setFase('resultado');
  }, []);

  /*
   * El timer guarda una referencia siempre fresca a finalizar: antes el intervalo
   * capturaba la versión del primer render y, al agotarse el tiempo, corregía el
   * test con las selecciones vacías del arranque (siempre daba 0).
   */
  const finalizarRef = useRef(finalizar);
  useEffect(() => {
    finalizarRef.current = finalizar;
  }, [finalizar]);

  // El tiempo se calcula contra timestamps, así no se desfasa si la pestaña queda en segundo plano.
  useEffect(() => {
    if (fase !== 'test') return;
    const tick = () => {
      const ahora = Date.now();
      if (finRef.current !== null) {
        const restante = Math.max(0, Math.round((finRef.current - ahora) / 1000));
        setSegundosRestantes(restante);
        if (restante <= 0) finalizarRef.current();
      } else {
        setSegundosTranscurridos(Math.max(0, Math.round((ahora - (inicioRef.current ?? ahora)) / 1000)));
      }
    };
    const intervalo = setInterval(tick, 1000);
    return () => clearInterval(intervalo);
  }, [fase]);

  const arrancar = useCallback(
    (seleccionadas: Pregunta[]) => {
      if (seleccionadas.length === 0) return;
      const ahora = Date.now();
      inicioRef.current = ahora;
      finRef.current = limiteSegundos !== null ? ahora + limiteSegundos * 1000 : null;
      activoRef.current = null;
      ultimoCambioRef.current = ahora;
      setPreguntas(seleccionadas);
      setSelecciones(Object.fromEntries(seleccionadas.map((pregunta) => [preguntaKey(pregunta), [] as string[]])));
      setTiempos({});
      setSegundosRestantes(limiteSegundos);
      setSegundosTranscurridos(0);
      setTiempoTotal(0);
      setFase('test');
    },
    [limiteSegundos],
  );

  const iniciarTest = useCallback(() => {
    arrancar(shuffle(preguntasFiltradas).slice(0, cantidadActiva));
  }, [arrancar, preguntasFiltradas, cantidadActiva]);

  const repetirMismasPreguntas = useCallback(() => {
    arrancar(shuffle(preguntas));
  }, [arrancar, preguntas]);

  const onToggleRespuesta = useCallback(
    (preguntaId: string, respuestaId: string, multiple: boolean) => {
      registrarFoco(preguntaId);
      setSelecciones((actual) => {
        const seleccion = actual[preguntaId] ?? [];
        if (!multiple) return { ...actual, [preguntaId]: [respuestaId] };
        return {
          ...actual,
          [preguntaId]: seleccion.includes(respuestaId)
            ? seleccion.filter((id) => id !== respuestaId)
            : [...seleccion, respuestaId],
        };
      });
    },
    [registrarFoco],
  );

  const onLimpiarRespuesta = useCallback((preguntaId: string) => {
    setSelecciones((actual) => ({ ...actual, [preguntaId]: [] }));
  }, []);

  const volverAlInicio = useCallback(() => {
    setFase('inicio');
    setPreguntas([]);
    setSelecciones({});
    setTiempos({});
    setTiempoTotal(0);
    inicioRef.current = null;
    finRef.current = null;
    activoRef.current = null;
  }, []);

  const alternarTema = useCallback(
    (tema: string) => {
      setTemasPorSeccion((actual) => {
        const vigentes = actual[seccion] ?? temasDisponibles.map((item) => item.tema);
        return {
          ...actual,
          [seccion]: vigentes.includes(tema) ? vigentes.filter((valor) => valor !== tema) : [...vigentes, tema],
        };
      });
    },
    [seccion, temasDisponibles],
  );

  if (!materia) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <Card className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-white">No hay materias cargadas</h1>
          <p className="mt-2 text-sm text-slate-400">
            Agregá al menos un archivo JSON en la carpeta <code className="text-cyan-300">data/</code> para
            empezar a practicar.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-8 md:pb-10 md:pt-10">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        {/*
         * Durante el test el encabezado se esconde en celular: son ~90px de alto
         * que no aportan nada mientras respondés y empujan la primera pregunta.
         */}
        <header
          className={cn(
            'flex-wrap items-end justify-between gap-4',
            fase === 'test' ? 'hidden sm:flex' : 'flex',
          )}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/70">Multiple choice</p>
            <h1 className="mt-1.5 text-2xl font-semibold text-white sm:text-3xl">Plataforma de estudio rápido</h1>
            {fase === 'inicio' && (
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Elegí materia, parcial y temas. Respondé el test y revisá el detalle de cada pregunta.
              </p>
            )}
          </div>
          {nombre && fase === 'inicio' && (
            <p className="text-sm text-slate-400">
              Hola, <span className="font-semibold text-white">{nombre}</span>
            </p>
          )}
        </header>

        {fase === 'inicio' && (
          <PantallaInicio
            materias={materias}
            nombre={nombre}
            onNombre={setNombre}
            materiaId={materia.materia}
            onMateria={(valor) => {
              setMateriaId(valor);
              setParcial(null);
            }}
            parcial={parcialActivo}
            parcialesDisponibles={parcialesDisponibles}
            onParcial={setParcial}
            totalDelParcial={preguntasDelParcial.length}
            temasDisponibles={temasDisponibles}
            temas={temas}
            onToggleTema={alternarTema}
            onTodosLosTemas={() =>
              setTemasPorSeccion((actual) => ({ ...actual, [seccion]: temasDisponibles.map((item) => item.tema) }))
            }
            onNingunTema={() => setTemasPorSeccion((actual) => ({ ...actual, [seccion]: [] }))}
            disponibles={preguntasFiltradas.length}
            cantidad={cantidadActiva}
            opcionesCantidad={opcionesCantidad}
            onCantidad={setCantidad}
            usarLimite={usarLimite}
            onUsarLimite={setUsarLimite}
            limiteMinutos={limiteMinutos}
            onLimiteMinutos={(valor) => setLimiteMinutos(normalizarMinutos(valor, limiteMinutos))}
            onIniciar={iniciarTest}
          />
        )}

        {fase === 'test' && (
          <PantallaTest
            materiaNombre={materia.materia}
            parcial={parcialActivo}
            preguntas={preguntas}
            selecciones={selecciones}
            onToggleRespuesta={onToggleRespuesta}
            onLimpiarRespuesta={onLimpiarRespuesta}
            onFocoPregunta={registrarFoco}
            usarLimite={usarLimite}
            segundosRestantes={segundosRestantes}
            segundosTranscurridos={segundosTranscurridos}
            onEnviar={finalizar}
            onAbandonar={volverAlInicio}
          />
        )}

        {fase === 'resultado' && (
          <PantallaResultado
            nombre={nombre}
            materiaNombre={materia.materia}
            parcial={parcialActivo}
            preguntas={preguntas}
            selecciones={selecciones}
            tiempos={tiempos}
            resumen={resumen}
            tiempoTotal={tiempoTotal}
            onRepetir={repetirMismasPreguntas}
            onNuevoTest={iniciarTest}
            onVolver={volverAlInicio}
          />
        )}
      </div>
    </main>
  );
}
