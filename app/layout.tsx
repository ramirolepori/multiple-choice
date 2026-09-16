import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-base',
});

export const metadata: Metadata = {
  title: 'Multiple Choice Studio',
  description: 'Plataforma simple para generar tests de estudio con preguntas aleatorias.',
};

export const viewport: Viewport = {
  themeColor: '#020617',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-[family-name:var(--fuente-base)] antialiased">{children}</body>
    </html>
  );
}
