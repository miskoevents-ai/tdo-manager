import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: { bg: "#F4EDE1", light: "#FAF6EE", warm: "#EAE0CF", deep: "#E3D7C2" },
        cream: "#FCFAF5",
        border: { DEFAULT: "#D8CFBE", soft: "#E7DECD", strong: "#C7BBA4" },
        ink: { DEFAULT: "#1F1F1F", secondary: "#555555", muted: "#7C7468" },
        foot: "#9A9A9A",
        sage: { DEFAULT: "#3F4A36", 600: "#4C5841", 300: "#8A957C", tint: "#EEF1EA", "tint-deep": "#DFE6D6" },
        clay: { DEFAULT: "#BE6E4C", 600: "#A85C3C", 300: "#D9A88E", tint: "#F4E4DA", "tint-deep": "#EAD0C0" },
        wood: { DEFAULT: "#B07F4F", deep: "#8A5A36" },
        ok: { DEFAULT: "#5B7350", tint: "#E9EFE3" },
        warn: { DEFAULT: "#B98A3E", tint: "#F6ECD7" },
        error: { DEFAULT: "#A65441", tint: "#F3E0DA" },
      },
      fontFamily: {
        display: ['var(--font-marcellus)', '"Cormorant Garamond"', "Georgia", "serif"],
        body: ['var(--font-montserrat)', '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      fontSize: {
        display: ["4.5rem", { lineHeight: "1.08", letterSpacing: "-0.01em" }],
        h1: ["3rem", { lineHeight: "1.08" }],
        h2: ["2.25rem", { lineHeight: "1.25" }],
        h3: ["1.625rem", { lineHeight: "1.25" }],
        h4: ["1.25rem", { lineHeight: "1.25" }],
        lead: ["1.25rem", { lineHeight: "1.7" }],
        body: ["1rem", { lineHeight: "1.55" }],
        small: ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.55" }],
        overline: ["0.6875rem", { lineHeight: "1.55", letterSpacing: "0.22em" }],
      },
      letterSpacing: { label: "0.04em", overline: "0.22em" },
      borderRadius: { xs: "3px", sm: "6px", md: "10px", lg: "16px", xl: "24px", pill: "999px" },
      borderWidth: { hair: "1px", med: "1.5px", thick: "2px" },
      boxShadow: {
        xs: "0 1px 2px rgba(60,48,30,0.06)",
        sm: "0 2px 8px rgba(60,48,30,0.07)",
        md: "0 8px 24px rgba(60,48,30,0.09)",
        lg: "0 18px 48px rgba(60,48,30,0.12)",
        ring: "0 0 0 3px rgba(63,74,54,0.22)",
        card: "0 1px 3px rgba(60,48,30,0.04), 0 6px 20px rgba(60,48,30,0.06)",
        "card-hover": "0 2px 6px rgba(60,48,30,0.06), 0 16px 40px rgba(60,48,30,0.11)",
      },
      maxWidth: { container: "1200px", "container-narrow": "820px" },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22,0.61,0.36,1)",
        "in-out": "cubic-bezier(0.45,0,0.25,1)",
      },
      transitionDuration: { fast: "140ms", base: "240ms", slow: "420ms" },
    },
  },
  plugins: [],
};

export default config;
