import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F3E8FF',
          100: '#E9D5FF',
          200: '#D8B4FE',
          300: '#C084FC',
          400: '#A855F7',
          500: '#9333EA',
          600: '#7E22CE',
          700: '#6B21A8',
          800: '#581C87',
          900: '#4C1D95',
          950: '#2D0A4E',
        },
        secondary: {
          500: '#EC4899',
          600: '#DB2777',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      textShadow: {
        'default': '0 2px 4px rgba(0,0,0,0.10)',
        'lg': '0 8px 16px rgba(0,0,0,0.20)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwindcss-textshadow'), // Added this line
  ],
};

export default config;