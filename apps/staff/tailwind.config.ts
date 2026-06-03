import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#b1454a",
          600: "#9a3a3f",
          700: "#7a2d31",
        },
        crimson: {
          700: "#7a2d31",
          800: "#5a2024",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
