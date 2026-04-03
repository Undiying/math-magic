/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#151A2A',
        primary: '#6366F1',
        secondary: '#A855F7',
        accent: '#EC4899',
      }
    },
  },
  plugins: [],
}
