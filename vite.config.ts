import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      // Use secure WebSocket protocol for WebContainer/Replit environments
      protocol: process.env.REPL_ID || process.env.WEBCONTAINER ? 'wss' : 'ws',
      // Use true to let Vite determine the correct host automatically
      host: process.env.REPL_ID || process.env.WEBCONTAINER ? true : '0.0.0.0',
      // Use standard HTTPS port for secure environments
      clientPort: process.env.REPL_ID || process.env.WEBCONTAINER ? 443 : 5000,
    },
  },
});