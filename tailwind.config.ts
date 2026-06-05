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
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-heading)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        '7xl': '1366px',
        prose: '70ch',
      },
      borderRadius: {
        '3xl': '0.75rem',
      },
      keyframes: {
        draw: { to: { strokeDashoffset: '0' } },
        fadeArea: { to: { opacity: '1' } },
        pop: { from: { opacity: '0', transform: 'scale(0.3)' }, to: { opacity: '1', transform: 'scale(1)' } },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        halo: { '0%': { r: '7', opacity: '0.35' }, '70%': { r: '18', opacity: '0' }, '100%': { opacity: '0' } },
        pulseDot: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(21,86,238,0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(21,86,238,0)' },
        },
      },
      animation: {
        draw: 'draw 1.8s cubic-bezier(.65,.05,.36,1) .3s forwards',
        fadeArea: 'fadeArea .8s ease 1.3s forwards',
        pop: 'pop .4s ease 2s forwards',
        bob: 'bob 5s ease-in-out infinite',
        halo: 'halo 2s ease 2.2s infinite',
        pulseDot: 'pulseDot 2s infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
