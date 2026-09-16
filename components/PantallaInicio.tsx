'use client';

import type { Materia } from '../types';
import { PUNTAJE_MAXIMO } from '../lib/quiz';
import { BarraProgreso, Boton, Card, TituloCampo, cn } from './ui';

const claseCampo =
  'w-full rounded-xl border border-contorno bg-slate-950/70 px-3.5 py-2.5 text-white outline-none transition focus:border-cyan-400';

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={`Paso ${numero}: ${titulo}`} className="space-y-3">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export type PantallaInicioProps = {
  materias: Materia[];
  nombre: string;
  onNombre: (valor: string) => void;
  materiaId: string;
  onMateria: (valor: string) => void;
  parcial: number;
  parcialesDisponibles: number[];
  onParcial: (valor: number) => void;
  totalDelParcial: number;
  temasDisponibles: { tema: string; cantidad: number }[];
  temas: string[];
  onToggleTema: (tema: string) => void;
  onTodosLosTemas: () => void;
  onNingunTema: () => void;
  disponibles: number;
  cantidad: number;
  opcionesCantidad: number[];
  onCantidad: (valor: number) => void;
  usarLimite: boolean;
  onUsarLimite: (valor: boolean) => void;
  limiteMinutos: number;
  onLimiteMinutos: (valor: number) => void;
  onIniciar: () => void;
};

export default function PantallaInicio({
  materias,
  nombre,
  onNombre,
  materiaId,
  onMateria,
  parcial,
  parcialesDisponibles,
  onParcial,
  totalDelParcial,
  temasDisponibles,
  temas,
  onToggleTema,
  onTodosLosTemas,
  onNingunTema,
  disponibles,
  cantidad,
  opcionesCantidad,
  onCantidad,
  usarLimite,
  onUsarLimite,
  limiteMinutos,
  onLimiteMinutos,
  onIniciar,
}: PantallaInicioProps) {
  const sinTemas = temasDisponibles.length > 0 && temas.length === 0;
  const puedeIniciar = disponibles > 0 && cantidad > 0 && cantidad <= disponibles;

  return (
    <div className="space-y-8 sm:space-y-10">
      <Paso numero={1} titulo="Qué vas a practicar">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <TituloCampo hint="Solo para esta sesión, no se guarda en ningún lado.">Tu nombre</TituloCampo>
            <input
              value={nombre}
              onChange={(event) => onNombre(event.target.value)}
              placeholder="Ej. Ramiro"
              autoComplete="given-name"
              className={claseCampo}
            />
          </label>

          <label className="space-y-2">
            <TituloCampo hint={`${materias.length} materias cargadas.`}>Materia</TituloCampo>
            <select value={materiaId} onChange={(event) => onMateria(event.target.value)} className={claseCampo}>
              {materias.map((materia) => (
                <option key={materia.materia} value={materia.materia}>
                  {materia.materia}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <TituloCampo hint={`${totalDelParcial} preguntas en este parcial.`}>Parcial</TituloCampo>
            <select
              value={parcial}
              onChange={(event) => onParcial(Number(event.target.value))}
              className={claseCampo}
            >
              {parcialesDisponibles.map((valor) => (
                <option key={valor} value={valor}>
                  Parcial {valor}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Paso>

      {temasDisponibles.length > 0 && (
        <Paso numero={2} titulo="Temas">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm text-slate-400">Elegí sobre qué temas querés que salgan las preguntas.</p>
              <div className="flex gap-2">
                <Boton variante="fantasma" tamano="sm" onClick={onTodosLosTemas}>
                  Todos
                </Boton>
                <Boton variante="fantasma" tamano="sm" onClick={onNingunTema}>
                  Ninguno
                </Boton>
              </div>
            </div>

            <ul className="flex flex-wrap gap-2">
              {temasDisponibles.map(({ tema, cantidad: cuantas }) => {
                const activo = temas.includes(tema);
                return (
                  <li key={tema}>
                    <button
                      type="button"
                      aria-pressed={activo}
                      onClick={() => onToggleTema(tema)}
                      className={cn(
                        'flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition',
                        activo
                          ? 'border-cyan-400/70 bg-cyan-400/10 text-cyan-200'
                          : 'border-contorno bg-slate-950/50 text-slate-400 hover:border-slate-500 hover:text-slate-200',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'grid h-4 w-4 place-items-center rounded-[5px] border text-[10px] font-bold',
                          activo ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-contorno',
                        )}
                      >
                        {activo ? '✓' : ''}
                      </span>
                      {tema}
                      <span className={activo ? 'text-cyan-300/70' : 'text-tenue'}>
                        {cuantas}
                        <span className="sr-only"> preguntas</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p role="status" className={cn('text-xs', sinTemas ? 'text-amber-300' : 'text-tenue')}>
              {sinTemas
                ? 'No hay preguntas con los temas elegidos: seleccioná al menos uno.'
                : `${disponibles} preguntas disponibles con los temas elegidos.`}
            </p>
          </Card>
        </Paso>
      )}

      <Paso numero={temasDisponibles.length > 0 ? 3 : 2} titulo="Formato del test">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4">
            <label className="space-y-2">
              <TituloCampo hint="El test siempre se escala a 10 puntos.">Cantidad de preguntas</TituloCampo>
              <select
                value={cantidad}
                onChange={(event) => onCantidad(Number(event.target.value))}
                disabled={opcionesCantidad.length === 0}
                className={claseCampo}
              >
                {opcionesCantidad.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor === disponibles ? `Todas (${valor})` : `${valor} preguntas`}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <TituloCampo hint="Si no lo activás, el test solo mide cuánto tardaste.">
                  Límite de tiempo
                </TituloCampo>
                <input
                  type="checkbox"
                  checked={usarLimite}
                  onChange={(event) => onUsarLimite(event.target.checked)}
                  className="h-5 w-5 shrink-0 rounded border-contorno bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                />
              </label>

              {usarLimite && (
                <div className="flex items-center gap-2">
                  <label htmlFor="limite-minutos" className="sr-only">
                    Minutos del límite de tiempo
                  </label>
                  <input
                    id="limite-minutos"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={180}
                    value={limiteMinutos}
                    onChange={(event) => onLimiteMinutos(Number(event.target.value))}
                    className={cn(claseCampo, 'w-24')}
                  />
                  <span className="text-sm text-slate-400">minutos</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-cyan-950/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Cómo se puntúa</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span aria-hidden className="text-cyan-400">
                  •
                </span>
                El test se escala a {PUNTAJE_MAXIMO} puntos, sin importar cuántas preguntas tenga.
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="text-cyan-400">
                  •
                </span>
                Cada pregunta vale {PUNTAJE_MAXIMO} / cantidad de preguntas.
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="text-cyan-400">
                  •
                </span>
                En las de opción múltiple, cada acierto suma y cada error resta el mismo peso.
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="text-cyan-400">
                  •
                </span>
                Ninguna pregunta puede darte puntaje negativo.
              </li>
            </ul>
          </Card>
        </div>
      </Paso>

      {/* Resumen y acción siempre al alcance del pulgar, sin volver al tope de la página. */}
      <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 sm:bottom-4">
        <Card className="flex flex-col gap-3 border-contorno bg-slate-900/95 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-2">
            <p className="truncate text-sm text-slate-400">
              <span className="font-semibold text-white">{materiaId}</span>
              <span aria-hidden> · </span>Parcial {parcial}
              <span aria-hidden> · </span>
              {cantidad} de {disponibles} preguntas
              {usarLimite ? ` · ${limiteMinutos} min` : ' · sin límite'}
            </p>
            <BarraProgreso
              valor={cantidad}
              maximo={Math.max(disponibles, 1)}
              etiqueta="Proporción del banco de preguntas que vas a practicar"
            />
          </div>
          <Boton
            tamano="lg"
            onClick={onIniciar}
            disabled={!puedeIniciar}
            className="w-full shrink-0 sm:w-auto"
          >
            Comenzar test
          </Boton>
        </Card>
      </div>
    </div>
  );
}
