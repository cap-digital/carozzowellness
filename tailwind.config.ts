import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand chrome — deep, earthy wellness identity
        forest: {
          950: "#161f0d",
          900: "#1b2612",
          800: "#26331a",
          700: "#324420",
          600: "#465907",
          500: "#5a7020",
          400: "#7c9440",
        },
        cream: {
          50: "#fdfcf8",
          100: "#f7f5ec",
          200: "#f3f1e7",
          300: "#eae7d6",
        },
        gold: {
          600: "#8f6d29",
          500: "#b08a3e",
          400: "#c9a463",
        },
        wine: "#942143",
        navy: "#293052",
        ink: {
          900: "#232a1c",
          600: "#5f5d52",
          400: "#97958a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(35,42,28,0.04), 0 6px 20px -8px rgba(35,42,28,0.10)",
        pop: "0 8px 30px -6px rgba(35,42,28,0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
