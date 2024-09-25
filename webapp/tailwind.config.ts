module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html", "./src/index.css"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F7FF',
          100: '#E0EFFE',
          200: '#BAD9FB',
          300: '#94C2F9',
          400: '#6EABF7',
          500: '#4894F5',
          600: '#2272D4',
          700: '#1C5AB0',
          800: '#16438C',
          900: '#102C68',
        },
        secondary: {
          50: '#F5F7FA',
          100: '#E4E7EB',
          200: '#CBD2D9',
          300: '#9AA5B1',
          400: '#7B8794',
          500: '#616E7C',
          600: '#52606D',
          700: '#3E4C59',
          800: '#323F4B',
          900: '#1F2933',
        },
        accent: {
          50: '#FFF9E6',
          100: '#FFF3CC',
          200: '#FFE799',
          300: '#FFDB66',
          400: '#FFCF33',
          500: '#FFC300',
          600: '#E6B000',
          700: '#CC9C00',
          800: '#B38800',
          900: '#996600',
        },
        neutral: {
          50: '#F7F7F7',
          100: '#E1E1E1',
          200: '#CFCFCF',
          300: '#B1B1B1',
          400: '#9E9E9E',
          500: '#7E7E7E',
          600: '#626262',
          700: '#515151',
          800: '#3B3B3B',
          900: '#222222',
        },
      },
      animation: {
        glitter: "glitter 4s linear infinite",
        fadeIn: "fadeIn 0.5s ease-out",
        pulse: "pulse 2s infinite",
        bounce: "bounce 1s infinite",
      },
      keyframes: {
        glitter: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        fadeIn: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        bounce: {
          "0%, 20%, 50%, 80%, 100%": {
            transform: "translateY(0)",
          },
          "40%": {
            transform: "translateY(-30px)",
          },
          "60%": {
            transform: "translateY(-15px)",
          },
        },
      },
      boxShadow: {
        "outline-secondary": "0 0 0 3px rgba(130, 87, 245, 0.5)",
      },
      borderRadius: {
        xl: "1.5rem",
      },
      screens: {
        'xxs': '320px', // For very small mobile devices
        'xs': '375px',  // For small mobile devices
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
