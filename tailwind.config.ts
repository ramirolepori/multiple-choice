import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * Dos tonos medidos contra los fondos reales de la app, porque los grises
         * de Tailwind que usábamos no llegaban a los mínimos de WCAG en tema oscuro:
         *
         *   tenue     5.1:1 sobre las tarjetas — texto chico secundario.
         *             Reemplaza a slate-500 (3.9:1) y slate-600 (2.5:1).
         *   contorno  3.5:1 sobre las tarjetas — bordes de controles interactivos,
         *             que son lo único que los delimita. slate-700 daba 1.8:1.
         */
        tenue: '#7a8798',
        contorno: '#5c6d82',
      },
    },
  },
  plugins: [],
};

export default config;
