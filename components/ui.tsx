'use client';

import { forwardRef, useEffect, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useDialogoModal } from './useDialogoModal';

export function cn(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
  as: Tag = 'div',
  etiqueta,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'nav';
  /** Nombre accesible del landmark, cuando `as` es uno (nav, section, aside). */
  etiqueta?: string;
}) {
  return (
    <Tag
      aria-label={etiqueta}
      className={cn(
        'rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/30 sm:p-5',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/*
 * El hint va como `aria-describedby` y no dentro del <label>: envuelto, se pegaba
 * al nombre accesible del campo y el lector anunciaba "Tu nombre Solo para esta
 * sesión, no se guarda en ningún lado" cada vez que entrabas al input.
 */
export function TituloCampo({
  children,
  hint,
  htmlFor,
  hintId,
}: {
  children: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  hintId?: string;
}) {
  return (
    <span className="block">
      <label htmlFor={htmlFor} className="block cursor-pointer text-sm font-medium text-slate-200">
        {children}
      </label>
      {hint ? (
        <span id={hintId} className="mt-0.5 block text-xs text-tenue">
          {hint}
        </span>
      ) : null}
    </span>
  );
}

type Variante = 'primario' | 'secundario' | 'fantasma';
type Tamano = 'sm' | 'md' | 'lg';

const variantes: Record<Variante, string> = {
  primario:
    'bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-tenue shadow-lg shadow-cyan-500/20 disabled:shadow-none',
  secundario: 'bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-tenue',
  fantasma:
    'border border-contorno bg-transparent text-slate-300 hover:border-slate-400 hover:text-white disabled:text-tenue',
};

/* Alturas pensadas para el pulgar: md llega a 44px, el mínimo cómodo en celular. */
const tamanos: Record<Tamano, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs',
  md: 'min-h-[44px] px-4 py-2.5 text-sm',
  lg: 'min-h-[52px] px-6 py-3.5 text-base',
};

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamano?: Tamano };

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { variante = 'primario', tamano = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed',
        variantes[variante],
        tamanos[tamano],
        className,
      )}
    />
  );
});

export function BarraProgreso({
  valor,
  maximo,
  etiqueta,
  tono = 'acento',
}: {
  valor: number;
  maximo: number;
  etiqueta: string;
  tono?: 'acento' | 'ok' | 'alerta';
}) {
  const porcentaje = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0;
  const tonos = {
    acento: 'bg-cyan-400',
    ok: 'bg-emerald-400',
    alerta: 'bg-amber-400',
  } as const;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(porcentaje)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tonos[tono])}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}

/** Píldora de métrica usada en la cabecera de resultados. */
export function Metrica({
  etiqueta,
  valor,
  detalle,
  tono = 'neutro',
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  tono?: 'neutro' | 'ok' | 'alerta' | 'error' | 'acento';
}) {
  const tonos = {
    neutro: 'text-white',
    ok: 'text-emerald-300',
    alerta: 'text-amber-300',
    error: 'text-rose-300',
    acento: 'text-cyan-300',
  } as const;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[11px] uppercase tracking-wider text-tenue sm:text-xs">{etiqueta}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums sm:text-2xl', tonos[tono])}>{valor}</p>
      {detalle ? <p className="mt-0.5 text-xs text-tenue">{detalle}</p> : null}
    </div>
  );
}

/**
 * Los diagramas de red son ilegibles en un celular de 375px. Tocarlos los abre
 * a pantalla completa, con scroll para poder recorrerlos.
 */
export function ImagenAmpliable({ src, alt }: { src: string; alt: string }) {
  const [abierta, setAbierta] = useState(false);
  const [tamanoReal, setTamanoReal] = useState(false);
  const visorRef = useDialogoModal(abierta, () => setAbierta(false));

  useEffect(() => {
    if (!abierta) setTamanoReal(false);
  }, [abierta]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ampliar ${alt}`}
        className="relative block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition hover:border-contorno"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-64 w-full rounded-lg object-contain sm:max-h-96"
          loading="lazy"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-slate-950/85 px-2 py-1 text-[11px] font-medium text-slate-300"
        >
          Ampliar
        </span>
      </button>

      {abierta && (
        <div
          ref={visorRef}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/97 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Boton variante="fantasma" onClick={() => setTamanoReal((valor) => !valor)}>
              {tamanoReal ? 'Ajustar al ancho' : 'Tamaño real'}
            </Boton>
            <Boton variante="secundario" onClick={() => setAbierta(false)} autoFocus>
              Cerrar
            </Boton>
          </div>
          {/*
           * Ajustado al ancho, un diagrama de 1000px sigue sin leerse en un celular.
           * A tamaño real el contenedor scrollea en los dos ejes para recorrerlo.
           */}
          <div className="mt-3 flex-1 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className={cn(
                tamanoReal ? 'max-w-none' : 'mx-auto w-full max-w-4xl object-contain',
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}
