'use client';

import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
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

/** Hay animaciones que se piden explícitamente (scroll suave) y hay que poder saltearlas. */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── Visor de imágenes ──────────────────────────────────────────────────────
 *
 * El visor viejo tenía dos estados y nada más: "ajustado al ancho" o "tamaño
 * real". En un celular eso no alcanza — un diagrama de 1000px ajustado es
 * ilegible y a tamaño real (2,7x la pantalla) te perdés sin poder ni acercar un
 * poco más ni un poco menos. Además arrancaba pegado al borde superior
 * izquierdo, así que al pasar a tamaño real veías la esquina en vez del centro.
 *
 * Ahora el zoom es continuo (pellizco, doble toque, rueda, botones, teclado) y
 * la imagen se arrastra con el dedo o con el mouse. Todo se resuelve con un
 * `transform`: la escala 1 es la imagen entera en pantalla y el desplazamiento
 * se limita para que nunca se escape del cuadro.
 */

const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
/** Salto de los botones y del teclado. */
const ZOOM_PASO = 1.4;
/** A dónde lleva el doble toque desde la vista ajustada. */
const ZOOM_DOBLE_TOQUE = 2.5;
const PASO_TECLADO = 64;
/** Un toque es "toque" si no se movió más que esto ni duró más que aquello. */
const TOQUE_MOVIMIENTO = 10;
const TOQUE_DURACION = 400;
const DOBLE_TOQUE_ESPERA = 350;

type Punto = { x: number; y: number };
type Vista = { escala: number; x: number; y: number; animada: boolean };

const SIN_ARRASTRE: Punto = { x: 0, y: 0 };
const VISTA_AJUSTADA: Vista = { escala: ZOOM_MIN, x: 0, y: 0, animada: false };

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function puntoMedio(a: Punto, b: Punto): Punto {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function posicion(evento: { clientX: number; clientY: number }): Punto {
  return { x: evento.clientX, y: evento.clientY };
}

export function ImagenAmpliable({ src, alt }: { src: string; alt: string }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ampliar ${alt}`}
        className="relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition hover:border-contorno"
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

      {/* El visor se monta y se desmonta: así el zoom siempre arranca ajustado. */}
      {abierta && <VisorImagen src={src} alt={alt} onCerrar={() => setAbierta(false)} />}
    </>
  );
}

function VisorImagen({ src, alt, onCerrar }: { src: string; alt: string; onCerrar: () => void }) {
  const dialogoRef = useDialogoModal(true, onCerrar);
  const lienzoRef = useRef<HTMLDivElement>(null);
  const imagenRef = useRef<HTMLImageElement>(null);
  const idAyuda = useId();
  const [vista, setVista] = useState<Vista>(VISTA_AJUSTADA);

  /* Punteros apoyados sobre el lienzo: uno arrastra, dos pellizcan. */
  const punteros = useRef(new Map<number, Punto>());
  const pellizco = useRef<{ separacion: number; centro: Punto } | null>(null);
  const arrastre = useRef<Punto | null>(null);
  const toque = useRef<{ desde: number; punto: Punto } | null>(null);
  const toquePrevio = useRef<{ hasta: number; punto: Punto } | null>(null);
  /** Si el gesto en curso arrastró o pellizcó, no es un toque limpio. */
  const movimiento = useRef(false);

  /**
   * Deja el desplazamiento dentro de lo que sobra de imagen: si un eje entra
   * entero en el lienzo queda centrado, y si no, puede moverse justo hasta el
   * borde. Sin esto la imagen se puede arrastrar fuera de la pantalla.
   */
  const acotar = useCallback((v: Vista): Vista => {
    const lienzo = lienzoRef.current;
    const imagen = imagenRef.current;
    if (!lienzo || !imagen) return v;
    const sobraX = Math.max(0, (imagen.clientWidth * v.escala - lienzo.clientWidth) / 2);
    const sobraY = Math.max(0, (imagen.clientHeight * v.escala - lienzo.clientHeight) / 2);
    return {
      ...v,
      x: Math.min(sobraX, Math.max(-sobraX, v.x)),
      y: Math.min(sobraY, Math.max(-sobraY, v.y)),
    };
  }, []);

  /**
   * Zoom y desplazamiento en una sola actualización (y por eso un único estado:
   * escalar y mover en dos `setState` encadenados aplicaba la corrección dos
   * veces en modo estricto). El punto anclado —los dedos, el cursor— es el que
   * tiene que quedarse donde está mientras el resto se agranda a su alrededor.
   */
  const transformar = useCallback(
    (factor: number, anclaCliente: Punto | null, corrimiento: Punto, animada: boolean) => {
      setVista((v) => {
        const escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.escala * factor));
        const k = escala / v.escala;
        const lienzo = lienzoRef.current;
        let ancla = SIN_ARRASTRE;
        if (lienzo && anclaCliente) {
          const caja = lienzo.getBoundingClientRect();
          ancla = {
            x: anclaCliente.x - (caja.left + caja.width / 2),
            y: anclaCliente.y - (caja.top + caja.height / 2),
          };
        }
        return acotar({
          escala,
          x: ancla.x - k * (ancla.x - v.x) + corrimiento.x,
          y: ancla.y - k * (ancla.y - v.y) + corrimiento.y,
          animada,
        });
      });
    },
    [acotar],
  );

  const zoom = useCallback(
    (factor: number, ancla: Punto | null = null, animada = true) =>
      transformar(factor, ancla, SIN_ARRASTRE, animada),
    [transformar],
  );

  const desplazar = useCallback(
    (dx: number, dy: number, animada = true) => transformar(1, null, { x: dx, y: dy }, animada),
    [transformar],
  );

  const ajustar = useCallback(() => setVista({ ...VISTA_AJUSTADA, animada: true }), []);

  /*
   * El foco arranca sobre la imagen, así las flechas y el +/− funcionan sin
   * tener que tabular. Va en un efecto y no en `autoFocus`: React aplica
   * `autoFocus` antes de que el diálogo anote desde dónde lo abrieron, y con eso
   * al cerrar el foco se perdía en el <body> en vez de volver a la miniatura.
   */
  useEffect(() => {
    lienzoRef.current?.focus({ preventScroll: true });
  }, []);

  const ajustada = vista.escala === ZOOM_MIN && vista.x === 0 && vista.y === 0;

  /*
   * La rueda tiene que acercar la imagen y no la página entera, así que hay que
   * cancelar el evento. React registra `onWheel` como pasivo (no deja cancelar
   * nada), por eso el listener va a mano sobre el lienzo.
   */
  useEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    const alRodar = (evento: WheelEvent) => {
      evento.preventDefault();
      // deltaMode 1 son líneas (Firefox); el resto ya viene en píxeles.
      const delta = evento.deltaMode === 1 ? evento.deltaY * 16 : evento.deltaY;
      zoom(Math.exp(-delta * 0.002), posicion(evento), false);
    };
    lienzo.addEventListener('wheel', alRodar, { passive: false });
    return () => lienzo.removeEventListener('wheel', alRodar);
  }, [zoom]);

  // Al rotar el celular cambian los límites y la imagen puede quedar descuadrada.
  useEffect(() => {
    const alRedimensionar = () => setVista((v) => acotar({ ...v, animada: false }));
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, [acotar]);

  const alPresionar = (evento: React.PointerEvent<HTMLDivElement>) => {
    const lienzo = lienzoRef.current;
    // jsdom no implementa la captura de punteros; en el navegador evita perder
    // el arrastre cuando el dedo se va del lienzo.
    if (typeof lienzo?.setPointerCapture === 'function') lienzo.setPointerCapture(evento.pointerId);

    punteros.current.set(evento.pointerId, posicion(evento));
    const apoyados = [...punteros.current.values()];

    if (apoyados.length >= 2) {
      pellizco.current = {
        separacion: distancia(apoyados[0], apoyados[1]),
        centro: puntoMedio(apoyados[0], apoyados[1]),
      };
      arrastre.current = null;
      toque.current = null;
      movimiento.current = true;
      return;
    }

    arrastre.current = posicion(evento);
    toque.current = { desde: Date.now(), punto: posicion(evento) };
    movimiento.current = false;
  };

  const alMover = (evento: React.PointerEvent<HTMLDivElement>) => {
    if (!punteros.current.has(evento.pointerId)) return;
    const punto = posicion(evento);
    punteros.current.set(evento.pointerId, punto);

    if (toque.current && distancia(punto, toque.current.punto) > TOQUE_MOVIMIENTO) {
      movimiento.current = true;
    }

    const apoyados = [...punteros.current.values()];

    if (apoyados.length >= 2 && pellizco.current) {
      const separacion = distancia(apoyados[0], apoyados[1]);
      const centro = puntoMedio(apoyados[0], apoyados[1]);
      const anterior = pellizco.current;
      pellizco.current = { separacion, centro };
      if (anterior.separacion > 0) {
        // El pellizco escala y además mueve: los dos dedos pueden desplazarse
        // mientras se separan.
        transformar(
          separacion / anterior.separacion,
          centro,
          { x: centro.x - anterior.centro.x, y: centro.y - anterior.centro.y },
          false,
        );
      }
      return;
    }

    if (apoyados.length === 1 && arrastre.current) {
      desplazar(punto.x - arrastre.current.x, punto.y - arrastre.current.y, false);
      arrastre.current = punto;
    }
  };

  /** Doble toque (o doble clic) para alternar entre ajustado y acercado. */
  const alternarZoom = (punto: Punto) => {
    if (vista.escala > ZOOM_MIN) ajustar();
    else zoom(ZOOM_DOBLE_TOQUE / vista.escala, punto);
  };

  const alSoltar = (evento: React.PointerEvent<HTMLDivElement>) => {
    const lienzo = lienzoRef.current;
    if (lienzo?.hasPointerCapture?.(evento.pointerId)) lienzo.releasePointerCapture(evento.pointerId);

    punteros.current.delete(evento.pointerId);
    const apoyados = [...punteros.current.values()];

    if (apoyados.length < 2) pellizco.current = null;
    if (apoyados.length === 1) {
      // Al levantar un dedo del pellizco, el que queda sigue arrastrando desde
      // donde está; si no, la imagen pega un salto.
      arrastre.current = apoyados[0];
      return;
    }
    if (apoyados.length > 0) return;

    arrastre.current = null;
    const gesto = toque.current;
    toque.current = null;
    const ahora = Date.now();
    if (!gesto || movimiento.current || ahora - gesto.desde > TOQUE_DURACION) {
      toquePrevio.current = null;
      return;
    }

    const punto = posicion(evento);
    const previo = toquePrevio.current;
    const dobleToque =
      previo !== null &&
      ahora - previo.hasta < DOBLE_TOQUE_ESPERA &&
      distancia(punto, previo.punto) < TOQUE_MOVIMIENTO * 4;

    toquePrevio.current = dobleToque ? null : { hasta: ahora, punto };
    if (dobleToque) alternarZoom(punto);
  };

  /*
   * Cerrar al tocar el fondo va en el click y no en el `pointerup`: si el visor
   * se desmonta antes, el navegador manda el click sintético del toque a lo que
   * quedó debajo y terminabas marcando una respuesta del test sin querer.
   */
  const alHacerClic = (evento: React.MouseEvent<HTMLDivElement>) => {
    if (evento.target !== evento.currentTarget || movimiento.current) return;
    onCerrar();
  };

  const alTeclear = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    switch (evento.key) {
      case '+':
      case '=':
        zoom(ZOOM_PASO);
        break;
      case '-':
      case '_':
        zoom(1 / ZOOM_PASO);
        break;
      case '0':
        ajustar();
        break;
      case 'ArrowLeft':
        desplazar(PASO_TECLADO, 0);
        break;
      case 'ArrowRight':
        desplazar(-PASO_TECLADO, 0);
        break;
      case 'ArrowUp':
        desplazar(0, PASO_TECLADO);
        break;
      case 'ArrowDown':
        desplazar(0, -PASO_TECLADO);
        break;
      default:
        return;
    }
    evento.preventDefault();
  };

  return (
    <div
      ref={dialogoRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onKeyDown={alTeclear}
      /*
       * El fondo iba en `bg-slate-950/97`: esa opacidad no está en la escala de
       * Tailwind, así que la clase nunca llegaba a generarse y el visor quedaba
       * transparente — el test se seguía leyendo por detrás del diagrama y
       * encima de los botones. Opaco y listo: son diagramas para leer, no hace
       * falta ver lo que hay atrás.
       */
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]"
    >
      {/* En una pantalla de 320px los controles no entran en una fila: se van a
          dos antes que salirse del borde, con "Cerrar" siempre a la derecha. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Boton
            variante="fantasma"
            aria-label="Alejar"
            disabled={vista.escala <= ZOOM_MIN}
            onClick={() => zoom(1 / ZOOM_PASO)}
            className="w-11 px-0 text-lg"
          >
            <span aria-hidden>−</span>
          </Boton>
          <span className="w-12 shrink-0 text-center text-xs tabular-nums text-slate-300">
            {`${Math.round(vista.escala * 100)}%`}
          </span>
          <Boton
            variante="fantasma"
            aria-label="Acercar"
            disabled={vista.escala >= ZOOM_MAX}
            onClick={() => zoom(ZOOM_PASO)}
            className="w-11 px-0 text-lg"
          >
            <span aria-hidden>+</span>
          </Boton>
          <Boton variante="fantasma" aria-label="Ajustar a la pantalla" disabled={ajustada} onClick={ajustar}>
            Ajustar
          </Boton>
        </div>
        <Boton variante="secundario" onClick={onCerrar} className="ml-auto">
          Cerrar
        </Boton>
      </div>

      {/*
       * `touch-none` le saca al navegador el scroll y el zoom propios: sin eso,
       * el pellizco hace zoom de toda la página (barras fijas incluidas) en vez
       * de la imagen. El lienzo entra en el recorrido del tabulador para poder
       * moverse con las flechas.
       */}
      <div
        ref={lienzoRef}
        role="group"
        aria-label="Imagen ampliada"
        aria-describedby={idAyuda}
        tabIndex={0}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClick={alHacerClic}
        className={cn(
          'relative mt-3 flex-1 touch-none select-none overflow-hidden',
          vista.escala > ZOOM_MIN ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imagenRef}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setVista((v) => acotar(v))}
          style={{
            transform: `translate(-50%, -50%) translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})`,
            transition: vista.animada ? 'transform 150ms ease-out' : 'none',
          }}
          className="absolute left-1/2 top-1/2 max-h-full max-w-full"
        />
      </div>

      <p id={idAyuda} className="shrink-0 pt-2 text-center text-[11px] leading-relaxed text-tenue">
        Pellizcá, tocá dos veces o usá la rueda para acercar <span aria-hidden>·</span> Arrastrá para
        moverte <span aria-hidden>·</span> Tocá fuera de la imagen para cerrar
      </p>
    </div>
  );
}
