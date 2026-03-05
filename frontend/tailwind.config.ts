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
        soft: "0 14px 30px rgba(15, 23, 42, 0.12)",
        card: "0 6px 14px rgba(15, 23, 42, 0.10)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
