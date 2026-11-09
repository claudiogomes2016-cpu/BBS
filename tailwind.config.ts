import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: token("page"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2"), 3: token("surface-3") },
        ink: { DEFAULT: token("ink"), 2: token("ink-2") },
        muted: token("muted"),
        accent: { DEFAULT: token("accent"), ink: token("accent-ink") },
        good: token("good"),
        warning: token("warning"),
        critical: token("critical"),
        pos: token("pos"),
        neg: token("neg"),
      },
      borderColor: { line: "rgb(var(--line))" },
      divideColor: { line: "rgb(var(--line))" },
    },
  },
  plugins: [],
} satisfies Config;
