import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "./",
  css: {
    postcss: "./postcss.config.js",
  },
  resolve: {
    alias: {
      "fhenixjs": "/node_modules/fhenixjs/dist/fhenix.umd.js",
    },
  },
});
