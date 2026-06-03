import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multiple Choice Studio',
  description: 'Plataforma simple para generar tests de estudio con preguntas aleatorias.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
