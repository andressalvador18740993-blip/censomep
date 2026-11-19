import type { Config } from "tailwindcss";

// Colores institucionales: morado #63008F · amarillo #FFF200
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mep: {
          purple: "#63008F",
          "purple-dark": "#4A006B",
          "purple-light": "#8A2FB8",
          yellow: "#FFF200",
          "yellow-dark": "#E6D800"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
