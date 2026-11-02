import type { Config } from "tailwindcss";

// Tokens from DESIGN.md (spring-mint / black / white). `primary` here is ink black (the everyday CTA fill);
// the spec's mint primary is `mint`.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "576px", md: "768px", lg: "992px", xl: "1200px" },
    extend: {
      colors: {
        primary: "#000000",
        "on-primary": "#ffffff",
        mint: { DEFAULT: "#00f0a0", band: "#ecffe0", deep: "#00b87a" },
        "mint-band": "#ecffe0",
        canvas: "#ffffff",
        app: "#fafcfa",
        soft: { DEFAULT: "#f2f4f5" },
        hairline: "#e5e7eb",
        ink: { DEFAULT: "#000000", strong: "#1a1a1a" },
        body: { DEFAULT: "#2b2f33", mid: "#5b6470" },
        mute: { DEFAULT: "#86909c", soft: "#b4bcc5" },
        muted: "#86909c",
        // status colours are data only (badges, differences, chart segments)
        accent: { green: "#00f0a0", yellow: "#ffae13", orange: "#ff6b00", red: "#ee1d36", "blue-info": "#146ef5" },
        "on-soft": { green: "#00704a", yellow: "#8a5a00", red: "#b3122a", blue: "#0f56c4" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Arial Narrow", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Inconsolata", "monospace"],
      },
      fontSize: {
        "display-xxl": ["80px", { lineHeight: "1.05", letterSpacing: "-1px", fontWeight: "700" }],
        "display-xl": ["60px", { lineHeight: "1.1", letterSpacing: "-0.5px", fontWeight: "700" }],
        "display-lg": ["48px", { lineHeight: "1.15", fontWeight: "700" }],
        "display-md": ["38px", { lineHeight: "1.2", fontWeight: "700" }],
        "display-sm": ["30px", { lineHeight: "1.25", fontWeight: "700" }],
        "display-xs": ["22px", { lineHeight: "1.3", fontWeight: "700" }],
        eyebrow: ["14px", { lineHeight: "1.4", letterSpacing: "1.2px", fontWeight: "600" }],
        "eyebrow-sm": ["12px", { lineHeight: "1.3", letterSpacing: "0.8px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "300" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "500" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "500" }],
        caption: ["13px", { lineHeight: "1.4", fontWeight: "600" }],
        "caption-mono": ["12px", { lineHeight: "18px" }],
      },
      borderRadius: { xs: "4px", sm: "12px", md: "24px", lg: "28px", pill: "36px", card: "40px" },
      spacing: { xxs: "4px", "3xl": "32px", section: "96px" },
      boxShadow: {
        "layer-2": "0 10px 30px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)",
        "layer-3": "0 16px 40px rgba(0,0,0,0.10), 0 3px 8px rgba(0,0,0,0.05)",
        "layer-4": "0 24px 60px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.12)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: { shimmer: "shimmer 1.4s infinite", marquee: "marquee 38s linear infinite" },
    },
  },
  plugins: [],
};
export default config;
