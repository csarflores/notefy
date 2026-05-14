// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: "#F5F5F7",
          card: "#FFFFFF",
          text: "#1D1D1F",
          blue: "#0071E3",
          gray: "#86868B"
        }
      },
      borderRadius: {
        'apple-xl': '1.25rem', // 20px
        'apple-2xl': '1.5rem', // 24px
      },
      boxShadow: {
        'apple-card': '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};
export default config;