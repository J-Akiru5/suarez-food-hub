import sharedConfig from "@repo/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [sharedConfig],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--playfair-display)", "serif"],
        sans: ["var(--plus-jakarta-sans)", "sans-serif"],
      },
    },
  },
};

export default config;
