import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const publicUrl = process.env.PUBLIC_URL;
const allowedHosts = publicUrl ? [new URL(publicUrl).hostname] : [];

export default defineConfig({
  plugins: [react()],
  experimental: { bundledDev: true },
  build: {
    rolldownOptions: {
      output: {
        // Pixi registers renderer extensions during module initialization.
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [{ name: "pixi", test: /node_modules\/pixi\.js/, maxSize: 1_000_000 }],
        },
      },
    },
  },
  server: { allowedHosts, strictPort: true },
  preview: { allowedHosts, strictPort: true },
});
