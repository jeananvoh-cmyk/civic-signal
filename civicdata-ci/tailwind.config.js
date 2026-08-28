/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#07101E',
          900: '#0A192F',
          800: '#112240',
          700: '#1E3A8A',
          600: '#2563EB',
          500: '#3B82F6',
          100: '#DBEAFE',
          50: '#EFF6FF',
        },
        terracotta: {
          700: '#C2410C',
          600: '#EA580C',
          500: '#F97316',
          400: '#FB923C',
          100: '#FFEDD5',
          50: '#FFF7ED',
        },
        civic: {
          red: '#EF4444',
          amber: '#F59E0B',
          green: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px -1px rgba(10, 25, 47, 0.08), 0 1px 4px -1px rgba(10, 25, 47, 0.04)',
        'card-hover': '0 12px 24px -4px rgba(10, 25, 47, 0.12), 0 4px 8px -2px rgba(10, 25, 47, 0.06)',
      }
    },
  },
  plugins: [],
}
