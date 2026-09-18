import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify("1.0.1"),
  },
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
