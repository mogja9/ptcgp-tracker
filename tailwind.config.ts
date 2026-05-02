import type { Config } from "tailwindcss";

// All palette tokens reference CSS variables (defined in globals.css) so the
// theme can swap by setting `data-theme="light"` on <html>. Each variable is
// stored as a space-separated RGB triple so Tailwind can apply opacity via
// `<alpha-value>`.
const themed = (cssVar: string) => `rgb(var(${cssVar}) / <alpha-value>)`;

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
          DEFAULT: themed("--bg-default"),
          raised: themed("--bg-raised"),
          card: themed("--bg-card"),
          hover: themed("--bg-hover"),
        },
        ink: {
          DEFAULT: themed("--ink-default"),
          muted: themed("--ink-muted"),
          dim: themed("--ink-dim"),
        },
        line: {
          DEFAULT: themed("--line-default"),
          strong: themed("--line-strong"),
        },
        accent: {
          DEFAULT: themed("--accent-default"),
          strong: themed("--accent-strong"),
        },
        gold: themed("--gold"),
        silver: themed("--silver"),
        bronze: themed("--bronze"),
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
          ss: themed("--tier-ss"),
          s:  themed("--tier-s"),
          a:  themed("--tier-a"),
          b:  themed("--tier-b"),
          c:  themed("--tier-c"),
          d:  themed("--tier-d"),
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
