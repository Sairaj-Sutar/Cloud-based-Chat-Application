/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bfd4ff',
          300: '#94b8ff',
          400: '#6a95ff',
          500: '#4d73f8',
          600: '#3d59dd',
          700: '#3348b3',
          800: '#2e3f8d',
          900: '#293869'
        }
      }
    }
  },
  plugins: []
};
