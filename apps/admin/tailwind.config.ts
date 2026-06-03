import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f3",
          100: "#fce7e8",
          200: "#f9d0d3",
          300: "#f4a9ae",
          400: "#ec7881",
          500: "#df4d59",
          600: "#cb2d3b",
          700: "#b1454a",
          800: "#9a2832",
          900: "#82232e",
          950: "#480e15",
        },
        crimson: {
          DEFAULT: "#b1454a",
          50: "#fdf2f3",
          100: "#fce7e8",
          200: "#f9d0d3",
          300: "#f4a9ae",
          400: "#ec7881",
          500: "#df4d59",
          600: "#cb2d3b",
          700: "#b1454a",
          800: "#9a2832",
          900: "#82232e",
          950: "#480e15",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      screens: {
        xs: "475px",
      },
    },
  },
  plugins: [],
};

export default config;
