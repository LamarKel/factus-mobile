/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Colores del catálogo público, definidos por tema (ver src/lib/temasCatalogo.js)
      colors: {
        cat: {
          bg: "var(--cat-bg)",
          surface: "var(--cat-surface)",
          soft: "var(--cat-soft)",
          primary: "var(--cat-primary)",
          "on-primary": "var(--cat-on-primary)",
          text: "var(--cat-text)",
          text2: "var(--cat-text2)",
          muted: "var(--cat-muted)",
          border: "var(--cat-border)",
        },
      },
    },
  },
  plugins: [],
};
