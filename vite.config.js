import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.BASE_PATH || "/2026-AX-Squad-chainview/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/chainview-api": {
        target: "https://chainview.kro.kr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chainview-api/, ""),
      },
    },
  },
});
