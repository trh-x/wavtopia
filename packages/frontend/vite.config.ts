import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
  build: {
    sourcemap: mode === "development",
    minify: mode !== "development",
  },
}));
