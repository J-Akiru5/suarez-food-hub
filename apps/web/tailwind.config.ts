import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#fdf2f2",
          100: "#fce4e4",
          200: "#facccc",
          300: "#f5a3a3",
          400: "#ed6b6b",
          500: "#b1454a",
          600: "#9a3a3f",
          700: "#822e33",
          800: "#6b2429",
          900: "#5a1f23",
          950: "#320d10",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50: "#fdf2f2",
          100: "#fce4e4",
          200: "#facccc",
          300: "#f5a3a3",
          400: "#ed6b6b",
          500: "#b1454a",
          600: "#9a3a3f",
          700: "#822e33",
          800: "#6b2429",
          900: "#5a1f23",
          950: "#320d10",
        },
        creamson: "#fff0de",
        "near-black": "#121212",
      },
      fontFamily: {
        sans: ["var(--plus-jakarta-sans)", "system-ui", "sans-serif"],
        heading: ["var(--playfair-display)", "Georgia", "serif"],
        playfair: ["var(--playfair-display)", "Georgia", "serif"],
        jakarta: ["var(--plus-jakarta-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        32: "32px",
      },
    },
  },
  plugins: [],
};

export default config;
