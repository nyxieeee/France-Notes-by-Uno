/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode
        'fn-bg': '#FFF8F6',
        'fn-card': '#FFFFFF',
        'fn-secondary-bg': '#FFD6E0',
        'fn-pink': '#F7A8B8',
        'fn-pink-hover': '#FF7FA3',
        'fn-accent': '#FFC2D1',
        'fn-text': '#5B4636',
        'fn-text-secondary': '#8C6A74',
        'fn-border': '#F3D8DE',
        'fn-success': '#A8D8B9',
        'fn-warning': '#FFD59E',
        'fn-error': '#FFB3C1',
        // Dark Mode
        'fn-dark-bg': '#1F1A1D',
        'fn-dark-card': '#2A2327',
        'fn-dark-secondary': '#332B30',
        'fn-dark-pink': '#F7A8B8',
        'fn-dark-pink-hover': '#FF8FB1',
        'fn-dark-accent': '#FFB3C7',
        'fn-dark-text': '#F9F1F3',
        'fn-dark-text-secondary': '#CBBAC1',
        'fn-dark-border': '#3A3136',
        'fn-dark-success': '#9FD4AF',
        'fn-dark-warning': '#F6C177',
        'fn-dark-error': '#F29CAB',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
        logo: ['"Baloo 2"', 'cursive'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'fn': '0 4px 24px 0 rgba(247, 168, 184, 0.13)',
        'fn-md': '0 8px 32px 0 rgba(247, 168, 184, 0.18)',
        'fn-lg': '0 16px 48px 0 rgba(247, 168, 184, 0.22)',
        'fn-dark': '0 4px 24px 0 rgba(0,0,0,0.35)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
