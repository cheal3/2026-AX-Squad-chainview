import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.BASE_PATH || "/2026-AX-Squad-chainview/",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/chainview-api": {
        target: "http://chainview.kro.kr:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chainview-api/, ""),
      },
    },
  },
});
