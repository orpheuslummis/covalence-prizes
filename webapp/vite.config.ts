import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    {
      name: "fix-fhenixjs-wasm",
      enforce: "pre",
      resolveId(source) {
        if (source === "./tfhe_bg.wasm") {
          return source + "?fix-fhenixjs";
        }
        return null;
      },
      async load(id) {
        if (id.endsWith("?fix-fhenixjs")) {
          const wasmPath = id.replace("?fix-fhenixjs", "");
          return `
            import initWasm from "${wasmPath}?init";
            const wasm = await initWasm();
            export default wasm;
          `;
        }
        return null;
      },
    },
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      external: ["util"],
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    exclude: ["util"],
  },
});
