import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function cn(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/30',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function TituloCampo({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="block">
      <span className="text-sm font-medium text-slate-200">{children}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
    </span>
  );
}

type Variante = 'primario' | 'secundario' | 'fantasma';
type Tamano = 'sm' | 'md' | 'lg';

const variantes: Record<Variante, string> = {
  primario:
    'bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-500 shadow-lg shadow-cyan-500/20 disabled:shadow-none',
  secundario: 'bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600',
  fantasma:
    'border border-slate-700 bg-transparent text-slate-300 hover:border-slate-500 hover:text-white disabled:text-slate-600',
};

const tamanos: Record<Tamano, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
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
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-500">{etiqueta}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', tonos[tono])}>{valor}</p>
      {detalle ? <p className="mt-0.5 text-xs text-slate-500">{detalle}</p> : null}
    </div>
  );
}
