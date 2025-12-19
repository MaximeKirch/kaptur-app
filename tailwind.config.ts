// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Le fond principal (Pas noir pur, mais presque : Zinc 950)
        background: "#09090b",

        // Les cartes / Inputs (Zinc 900)
        surface: "#18181b",
        "surface-highlight": "#27272a", // Pour les états "pressés"

        // Les bordures subtiles (Zinc 800)
        border: "#27272a",

        // Le texte
        text: "#f4f4f5", // Zinc 100 (Blanc cassé, plus doux)
        "text-muted": "#a1a1aa", // Zinc 400

        // La couleur de marque (Un bleu électrique qui pop sur le noir)
        primary: "#3b82f6", // Blue 500
        "primary-dark": "#2563eb", // Blue 600

        error: "#ef4444",
      },
    },
  },
  plugins: [],
};
