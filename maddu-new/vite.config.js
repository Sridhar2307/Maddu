import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
