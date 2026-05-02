import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NXT.Bargains palette — bargain-y, energetic, but readable
        primary: {
          DEFAULT: '#E11D48',
          emphasis: '#BE123C',
          hover: '#FECDD3',
          pressed: '#9F1239',
        },
        accent: {
          DEFAULT: '#F59E0B',
          emphasis: '#D97706',
        },
        ink: '#0F172A',
        paper: '#FAFAF9',
        muted: '#F1F5F9',
      },
      fontFamily: {
        // Body: Outfit, weight 300 by default (set on <body>).
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        // Headings + display: Urbanist.
        display: ['var(--font-urbanist)', 'system-ui', 'sans-serif'],
        urbanist: ['var(--font-urbanist)', 'system-ui', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { prose: '70ch' },
      borderRadius: {
        '3xl': '0.75rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
