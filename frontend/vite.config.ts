import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(
      new Date().toISOString().slice(0, 10).replace(/-/g, ".") + "." + Date.now().toString().slice(-4)
    )
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // lo registramos manualmente en src/pwa.ts
      includeAssets: ["favicon.svg"],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//]
      },
      manifest: {
        name: "Militante MEP",
        short_name: "Militante MEP",
        description: "Censo, re-censo y carnetización de militantes del MEP",
        theme_color: "#63008F",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
