'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Comportamiento de teclado que espera un diálogo modal (WCAG 2.1.2 y 2.4.3):
 * cierra con Escape, mantiene el Tab dentro del diálogo mientras está abierto
 * y devuelve el foco al control que lo abrió.
 *
 * Devuelve la ref que hay que colgar del contenedor con role="dialog".
 */
export function useDialogoModal(abierto: boolean, alCerrar: () => void) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<Element | null>(null);

  // El callback se lee por ref para que un arrow inline no reinicie el efecto
  // en cada render (y con eso devuelva el foco de más).
  const cerrarRef = useRef(alCerrar);
  useEffect(() => {
    cerrarRef.current = alCerrar;
  }, [alCerrar]);

  useEffect(() => {
    if (!abierto) return;
    disparadorRef.current = document.activeElement;

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        cerrarRef.current();
        return;
      }
      if (evento.key !== 'Tab') return;

      const nodos = contenedorRef.current?.querySelectorAll<HTMLElement>(FOCUSABLES);
      if (!nodos?.length) return;

      const primero = nodos[0];
      const ultimo = nodos[nodos.length - 1];
      const activo = document.activeElement;
      const adentro = contenedorRef.current?.contains(activo) ?? false;

      if (evento.shiftKey && (activo === primero || !adentro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (activo === ultimo || !adentro)) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      const disparador = disparadorRef.current;
      // Puede haber desaparecido si al cerrar cambió de pantalla.
      if (disparador instanceof HTMLElement && document.contains(disparador)) {
        disparador.focus();
      }
    };
  }, [abierto]);

  return contenedorRef;
}
