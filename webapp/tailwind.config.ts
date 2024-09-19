module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        purple: {
          950: "#242424",
          800: "#9333ea",
          700: "#7e22ce",
          600: "#6b21a8",
          500: "#5a189a",
        },
        secondary: {
          500: "#3B82F6",
          600: "#2563EB",
        },
        primary: {
          900: "#1a202c",
          800: "#2c3e50",
        },
        green: {
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        red: {
          500: "#EF4444",
          600: "#DC2626",
        },
        yellow: {
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      spacing: {
        128: "32rem",
        144: "36rem",
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
        'outline-purple': '0 0 0 3px rgba(147, 51, 234, 0.5)',
      },
      borderRadius: {
        'xl': '1.5rem',
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    // Add other plugins as needed
  ],
};
