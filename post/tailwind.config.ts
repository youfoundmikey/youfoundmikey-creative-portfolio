import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#161512",
        paper: "#F6F1E7",
        accent: "#FF4000",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
      },
      minHeight: {
        tap: "44px",
      },
    },
  },
  plugins: [],
} satisfies Config;
