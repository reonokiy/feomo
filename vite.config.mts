import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  // Get GoToSocial instance URL from environment
  const gtsInstanceUrl = env.VITE_GOTOSOCIAL_INSTANCE_URL || "https://your-instance.social";

  console.log("========================================");
  console.log("🚀 Memos for GoToSocial");
  console.log("========================================");
  console.log("Mode:", mode);
  console.log("GoToSocial Instance:", gtsInstanceUrl);
  console.log("Dev Server: http://localhost:3001");
  console.log("========================================");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 3001,
      // No proxy needed - we connect directly to GoToSocial instance
      // via the masto.js client using CORS
    },
    resolve: {
      alias: {
        "@/": `${resolve(__dirname, "src")}/`,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "utils-vendor": ["dayjs", "lodash-es"],
            "katex-vendor": ["katex"],
            "mermaid-vendor": ["mermaid"],
            "leaflet-vendor": ["leaflet", "react-leaflet"],
            "masto-vendor": ["masto"],
          },
        },
      },
    },
  };
});
