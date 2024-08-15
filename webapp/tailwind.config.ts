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
        toast: {
          warn: '#FEF3C7',
          warnText: '#92400E',
          success: '#D1FAE5',
          successText: '#065F46',
          error: '#FEE2E2',
          errorText: '#991B1B',
          info: '#E0F2FE',
          infoText: '#075985',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      textShadow: {
        'default': '0 2px 4px rgba(0,0,0,0.10)',
        'lg': '0 8px 16px rgba(0,0,0,0.20)',
      },
      backgroundColor: {
        'toast-success': '#D1FAE5',
        'toast-error': '#FEE2E2',
        'toast-info': '#E0F2FE',
        'toast-warning': '#FEF3C7',
      },
      textColor: {
        'toast-success': '#065F46',
        'toast-error': '#991B1B',
        'toast-info': '#075985',
        'toast-warning': '#92400E',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwindcss-textshadow'),
  ],
};

export default config;