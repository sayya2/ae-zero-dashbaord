import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#73a638",
          dark: "#1a1a1a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
