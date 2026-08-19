import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("leaflet")) return "vendor-maps";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("autotable")) return "vendor-export";
            if (id.includes("@radix-ui") || id.includes("framer-motion") || id.includes("lucide-react")) return "vendor-ui";
            if (id.includes("@supabase")) return "vendor-supabase";
          }
        },
      },
    },
  },
}));
