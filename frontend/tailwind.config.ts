import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00c3a5",
          dark: "#0b4b3f",
          soft: "#def9f2"
        },
        ink: "#242727"
      },
      boxShadow: {
        soft: "0 16px 34px rgba(36, 39, 39, 0.10)",
        card: "0 10px 22px rgba(36, 39, 39, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
