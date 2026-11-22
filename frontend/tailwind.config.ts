import type { Config } from "tailwindcss";

// Colores institucionales: morado #63008F · amarillo #FFF200
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mep: {
          purple: {
            DEFAULT: "#63008F",
            dark: "#4A006B",
            deep: "#35004D",
            light: "#8A2FB8",
            50: "#F7F0FB",
            100: "#EDDFF6",
            200: "#DBBFEC",
            300: "#C393DD",
            400: "#A45FC7",
            500: "#63008F",
            600: "#56007C",
            700: "#450063",
            800: "#330049",
            900: "#240033"
          },
          yellow: {
            DEFAULT: "#FFF200",
            dark: "#E6D800",
            soft: "#FFFBCC"
          }
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(36, 0, 51, 0.06), 0 4px 16px rgba(36, 0, 51, 0.06)",
        card: "0 1px 3px rgba(36, 0, 51, 0.08), 0 10px 30px -12px rgba(36, 0, 51, 0.18)",
        lift: "0 18px 40px -18px rgba(36, 0, 51, 0.35)",
        "inner-line": "inset 0 0 0 1px rgba(99, 0, 143, 0.08)"
      },
      borderRadius: {
        xl2: "1.15rem"
      },
      backgroundImage: {
        "brand":
          "radial-gradient(1200px 600px at 100% -10%, rgba(255, 242, 0, 0.16), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(255, 255, 255, 0.12), transparent 55%), linear-gradient(135deg, #4A006B 0%, #63008F 45%, #7A16A8 100%)",
        "brand-gradient": "linear-gradient(135deg, #4A006B 0%, #63008F 45%, #7A16A8 100%)",
        "brand-radial":
          "radial-gradient(1200px 600px at 100% -10%, rgba(255, 242, 0, 0.16), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(255, 255, 255, 0.12), transparent 55%)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "slide-up": "slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.2s ease-out both"
      }
    }
  },
  plugins: []
} satisfies Config;
