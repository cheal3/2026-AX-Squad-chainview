import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/2026-AX-Squad-chainview/",
  plugins: [react(), tailwindcss()],
});
