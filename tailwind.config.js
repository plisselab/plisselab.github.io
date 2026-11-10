/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './cardapio/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Identidade plissê lab (usada na loja). Ver o guia de marca.
        vinho: { DEFAULT: '#7A1030', escuro: '#5F0C25' },
        magenta: '#D4336C',
        pessego: { DEFAULT: '#F3E3D3', escuro: '#EAD3BE' },
        salvia: '#7FA89A',
        chocolate: '#2B1418',
        creme: '#FAF1E8',
        brand: {
          50: '#eefdf4',
          100: '#d6fae3',
          200: '#b0f3cc',
          300: '#7ce7ad',
          400: '#45d488',
          500: '#1fba6c',
          600: '#149656',
          700: '#137748',
          800: '#135e3c',
          900: '#114d33',
          950: '#052b1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        marca: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'save-pop': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'check-in': {
          '0%': { transform: 'scale(0) rotate(-20deg)', opacity: '0' },
          '60%': { transform: 'scale(1.25) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
      animation: {
        'save-pop': 'save-pop 0.35s ease-out',
        'check-in': 'check-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
