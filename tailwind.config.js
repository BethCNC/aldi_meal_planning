/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8fc766",
        "primary-dark": "#76b043",
        stone: {
            50: "#FBFBF9",
            100: "#F5F5F0",
            200: "#EBEBE5",
            300: "#DCDCD4",
            400: "#BDBDB0",
            500: "#949485",
            600: "#757567",
            700: "#5C5C50",
            800: "#42423A",
            900: "#292924"
        }
      },
      fontFamily: {
          sans: ['Plus Jakarta Sans', 'sans-serif'],
          display: ['Plus Jakarta Sans', 'sans-serif']
      }
    },
  },
  plugins: [],
}
