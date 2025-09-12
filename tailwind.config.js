/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#F26726", // Naranja principal
        secondary: "#EBD52C", // Amarillo
        accent: "#E23694", // Rosa/Magenta
        teal: "#19A3A2", // Teal/Cyan
        dark: "#334C5D", // Azul oscuro
        // Colores específicos de la marca Cortés Rueda
        'cortes-orange': "#F26726",
        'cortes-yellow': "#EBD52C", 
        'cortes-pink': "#E23694",
        'cortes-teal': "#19A3A2",
        'cortes-dark': "#334C5D",
      },
    },
  },
  plugins: [],
} 