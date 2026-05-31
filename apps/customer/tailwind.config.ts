import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f2",
          100: "#fce4e4",
          200: "#f9cdcd",
          300: "#f4a8a8",
          400: "#ec7676",
          500: "#b1454a",
          600: "#9a3a3f",
          700: "#832f34",
          800: "#6d282c",
          900: "#5c2428",
        },
        crimson: {
          DEFAULT: "#b1454a",
          50: "#fdf2f2",
          100: "#fce4e4",
          200: "#f9cdcd",
          300: "#f4a8a8",
          400: "#ec7676",
          500: "#b1454a",
          600: "#9a3a3f",
          700: "#832f34",
          800: "#6d282c",
          900: "#5c2428",
        },
        creamson: "#fff0de",
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: [
          "Playfair Display",
          "Georgia",
          "serif",
        ],
      },
      screens: {
        xs: "475px",
      },
      borderRadius: {
        "32": "32px",
        "24": "24px",
        "30": "30px",
      },
      boxShadow: {
        "4xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
