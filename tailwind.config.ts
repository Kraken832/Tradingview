import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0e11",
          soft: "#131722",
          panel: "#1a1f2b",
          border: "#2a2e39",
        },
        accent: {
          DEFAULT: "#2962ff",
          up: "#26a69a",
          down: "#ef5350",
        },
        muted: "#787b86",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
