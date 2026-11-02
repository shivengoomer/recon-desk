import type { Config } from "tailwindcss";

// Tokens from DESIGN.md. Weight ceiling is 600; no pill CTAs; accents are surface fills.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "480px", md: "768px", lg: "992px", xl: "1280px" },
    extend: {
      colors: {
        primary: "#080808",
        "on-primary": "#ffffff",
        canvas: "#ffffff",
        hairline: "#d8d8d8",
        ink: { DEFAULT: "#080808", strong: "#222222" },
        body: { DEFAULT: "#363636", mid: "#5a5a5a" },
        mute: { DEFAULT: "#898989", soft: "#ababab" },
        accent: {
          purple: "#7a3dff",
          pink: "#ed52cb",
          blue: "#3b89ff",
          "blue-deep": "#006acc",
          "blue-info": "#146ef5",
          orange: "#ff6b00",
          green: "#00d722",
          yellow: "#ffae13",
          red: "#ee1d36",
        },
        // Darkened text variants for soft badges (AA on a 12% tint of the accent).
        "on-soft": { green: "#007a14", yellow: "#8a5a00", red: "#b3122a", blue: "#0f56c4" },
        soft: { DEFAULT: "#f6f6f6" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "Inconsolata", "monospace"],
      },
      fontSize: {
        "display-xxl": ["80px", { lineHeight: "83.2px", letterSpacing: "-0.8px", fontWeight: "600" }],
        "display-xl": ["56px", { lineHeight: "58.24px", fontWeight: "600" }],
        "display-lg": ["44.8px", { lineHeight: "46.6px", fontWeight: "600" }],
        "display-md": ["32px", { lineHeight: "41.6px", fontWeight: "500" }],
        "display-sm": ["24px", { lineHeight: "31.2px", fontWeight: "500" }],
        "display-xs": ["20px", { lineHeight: "28px", fontWeight: "500" }],
        eyebrow: ["15px", { lineHeight: "19.5px", letterSpacing: "1.5px", fontWeight: "500" }],
        "eyebrow-sm": ["12px", { lineHeight: "12px", letterSpacing: "0.6px", fontWeight: "500" }],
        "body-lg": ["28.8px", { lineHeight: "46.08px", letterSpacing: "-0.288px" }],
        "body-md": ["16px", { lineHeight: "25.6px", letterSpacing: "-0.16px" }],
        "body-sm": ["14px", { lineHeight: "22.4px" }],
        caption: ["12.8px", { lineHeight: "15.36px", fontWeight: "550" }],
        "caption-mono": ["12px", { lineHeight: "18px" }],
      },
      borderRadius: { xs: "2px", sm: "4px", md: "8px" },
      spacing: { xxs: "2px", "3xl": "32px" },
      boxShadow: {
        "layer-2":
          "0 84px 24px rgba(0,0,0,0), 0 54px 22px rgba(0,0,0,0.01), 0 30px 18px rgba(0,0,0,0.04), 0 13px 13px rgba(0,0,0,0.08), 0 3px 7px rgba(0,0,0,0.09)",
        "layer-3":
          "0 84px 24px rgba(0,0,0,0), 0 54px 22px rgba(0,0,0,0.02), 0 30px 18px rgba(0,0,0,0.06), 0 13px 13px rgba(0,0,0,0.1), 0 3px 7px rgba(0,0,0,0.12)",
        "layer-4": "0 24px 24px rgba(0,0,0,0.26), 0 6px 13px rgba(0,0,0,0.29)",
      },
      keyframes: { shimmer: { "100%": { transform: "translateX(100%)" } } },
      animation: { shimmer: "shimmer 1.4s infinite" },
    },
  },
  plugins: [],
};
export default config;
