import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split vendor libs so module chunks stay small and cache well.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) return "react-vendor";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul") || id.includes("sonner")) return "ui-vendor";
          if (id.includes("@supabase") || id.includes("@lovable.dev")) return "supabase-vendor";
          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) return "monaco-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("date-fns")) return "date-vendor";
          if (id.includes("xlsx") || id.includes("exceljs") || id.includes("papaparse")) return "spreadsheet-vendor";
          return "vendor";
        },
      },
    },
  },
}));
