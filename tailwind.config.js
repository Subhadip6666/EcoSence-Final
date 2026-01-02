
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'pulse-soft': 'pulse-soft 2s infinite ease-in-out',
        'scan': 'scan-move 2.5s linear infinite',
        'grid': 'grid-scroll 3s linear infinite',
        'flicker': 'digital-flicker 4s infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'scan-move': {
          '0%': { top: '-5%' },
          '100%': { top: '105%' },
        },
        'grid-scroll': {
          '0%': { 'background-position': '0 0' },
          '100%': { 'background-position': '0 40px' },
        },
        'digital-flicker': {
          '0%': { opacity: '1' },
          '5%': { opacity: '0.8' },
          '10%': { opacity: '1' },
          '15%': { opacity: '0.9' },
          '20%': { opacity: '1' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
