import { Inter } from 'next/font/google';

/** Global UI font — applied in root layout; `--font-sans` for Tailwind `font-sans`. */
export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});
