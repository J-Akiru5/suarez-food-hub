import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f3",
          100: "#fce7e8",
          200: "#f9d0d3",
          300: "#f4a9ae",
          400: "#ec7680",
          500: "#e04a58",
          600: "#b1454a",
          700: "#9a3a3e",
          800: "#813337",
          900: "#6e2f33",
          950: "#3c1518",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair-display)", "serif"],
        sans: ["var(--font-plus-jakarta-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
