/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Couleur d'accent bleue principale
        accent: {
          DEFAULT: "#2563EB",
          dark: "#1D4ED8",
        },
        // Palette de texte
        ink: {
          DEFAULT: "#1C1917",
          light: "#57534E",
          muted: "#A8A29E",
        },
        // Surfaces et bordures
        edge: "#E5E2DC",
        paper: "#F5F2EE",
      },
      fontFamily: {
        fraunces: ["Fraunces", "Georgia", "serif"],
        grotesk: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      borderWidth: {
        1.5: "1.5px",
      },
    },
  },
  plugins: [],
};
