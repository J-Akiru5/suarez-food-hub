import sharedConfig from "@repo/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [sharedConfig],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
    },
  },
};

export default config;
