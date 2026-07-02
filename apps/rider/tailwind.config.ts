import sharedConfig from "@repo/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [sharedConfig],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-playfair-display)", "serif"],
        sans: ["var(--font-plus-jakarta-sans)", "sans-serif"],
      },
    },
  },
};

export default config;
