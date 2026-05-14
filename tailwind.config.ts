import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NXT.Bargains palette — primary blue per brand spec
        primary: {
          DEFAULT: '#1556ee',
          emphasis: '#0f43c0',
          hover: '#c8d6fb',
          pressed: '#0c389f',
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
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        '7xl': '1366px',
        prose: '70ch',
      },
      borderRadius: {
        '3xl': '0.75rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
