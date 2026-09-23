/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  safelist: [
    { pattern: /bg-(emerald|blue|amber|violet|cyan|rose|sky|orange)-(500|50|100|600|700)/, variants: ['dark'] },
    { pattern: /text-(emerald|blue|amber|violet|cyan|rose|sky|orange)-(500|400|600)/, variants: ['dark'] },
    { pattern: /ring-(emerald|blue|amber|violet|cyan|rose|sky|orange)-500/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Josefin Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Josefin Sans"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        accent: {
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
          800: 'rgb(var(--accent-800) / <alpha-value>)',
          900: 'rgb(var(--accent-900) / <alpha-value>)',
        },
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -4px rgba(15,23,42,0.08), 0 24px 48px -20px rgba(15,23,42,0.12)',
        'soft-dark': '0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 24px -4px rgba(0,0,0,0.5), 0 24px 48px -20px rgba(0,0,0,0.6)',
        lift: '0 2px 4px rgba(15,23,42,0.05), 0 16px 32px -8px rgba(15,23,42,0.14), 0 32px 64px -24px rgba(15,23,42,0.16)',
        'lift-dark': '0 0 0 1px rgba(255,255,255,0.08) inset, 0 16px 32px -8px rgba(0,0,0,0.6), 0 32px 64px -24px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgb(var(--accent-500) / 0.15), 0 8px 32px rgb(var(--accent-500) / 0.18)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
