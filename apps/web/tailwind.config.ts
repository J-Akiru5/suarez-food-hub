import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
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
          50: "#FDF5F0",
          100: "#FAE8DB",
          200: "#F5CEAF",
          300: "#E8A97A",
          400: "#D68A52",
          500: "#B85C38",
          600: "#A0522D",
          700: "#8B4726",
          800: "#6F381E",
          900: "#5A2D18",
          950: "#3A1A0D",
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
          50: "#FDF5F0",
          100: "#FAE8DB",
          200: "#F5CEAF",
          300: "#E8A97A",
          400: "#D68A52",
          500: "#B85C38",
          600: "#A0522D",
          700: "#8B4726",
          800: "#6F381E",
          900: "#5A2D18",
          950: "#3A1A0D",
        },
        cream: "#FFF8F0",
        copper: {
          DEFAULT: "#B85C38",
          dark: "#A0522D",
          light: "#D68A52",
        },
        "near-black": "#1A1A1A",
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
