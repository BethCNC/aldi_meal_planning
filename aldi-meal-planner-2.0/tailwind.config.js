/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#fbbf24', // amber-400
        'primary-dark': '#f59e0b', // amber-500
      },
    },
  },
  plugins: [],
}
