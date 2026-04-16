import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        bg: {
          DEFAULT: "#0b0d12",
          raised: "#11141b",
          card: "#151923",
          hover: "#1c2230",
        },
        ink: {
          DEFAULT: "#e7ecf3",
          muted: "#9aa3b2",
          dim: "#6b7385",
        },
        line: {
          DEFAULT: "#1f2533",
          strong: "#2a3142",
        },
        accent: {
          DEFAULT: "#7cc4ff",
          strong: "#3aa0ff",
        },
        gold: "#f0c674",
        silver: "#c5cdd9",
        bronze: "#c08658",
        // Pokemon type colors (used for energy/type tags)
        type: {
          grass: "#5ec07c",
          fire: "#ff7a5c",
          water: "#5cb3ff",
          electric: "#f1c84a",
          psychic: "#c780ff",
          fighting: "#c87358",
          dark: "#4f5b6d",
          metal: "#9aa3b2",
          dragon: "#b69053",
          colorless: "#b6b9c2",
        },
        tier: {
          ss: "#ff5b8a",
          s: "#ff8c42",
          a: "#f6c33b",
          b: "#7ed957",
          c: "#5cb3ff",
          d: "#9aa3b2",
        },
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
    },
  },
  plugins: [],
};

export default config;
