import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

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
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.ico", "robots.txt", "icons/*.png"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}"],
      },
      manifest: {
        id: "ci.signa.app",
        // ASCII-only strings to avoid UTF-8/Latin-1 mojibake in PWA manifest serialization
        name: "SIGNA-CI - Signalements Abidjan",
        short_name: "SIGNA-CI",
        description: "La premiere plateforme citoyenne ivoirienne ou les habitants contribuent a l'amelioration des services et infrastructures publiques.",
        theme_color: "#1a2744",
        background_color: "#1a2744",
        display: "standalone",
        // window-controls-overlay for desktop PWA title bar; fallback to standalone
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        orientation: "portrait",
        lang: "fr",
        dir: "ltr",
        scope: "/",
        start_url: "/?source=pwa",
        categories: ["utilities", "social", "productivity"],
        prefer_related_applications: false,
        related_applications: [],
        // IARC rating: general audience (no violence/adult content)
        iarc_rating_id: "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7",
        icons: [
          // purpose "any" = normal rendering (not maskable)
          { src: "/icons/icon-192.png",      sizes: "192x192",   type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png",      sizes: "512x512",   type: "image/png", purpose: "any" },
          { src: "/icons/icon-1024.png",     sizes: "1024x1024", type: "image/png", purpose: "any" },
          // Dedicated maskable icon with safe-zone padding (generated separately)
          { src: "/icons/icon-maskable.png", sizes: "512x512",   type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          {
            src: "/screenshots/screenshot-home.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            platform: "android",
            label: "Accueil SIGNA-CI - Signalez en 30 secondes",
          },
          {
            src: "/screenshots/screenshot-map.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            platform: "android",
            label: "Carte live des signalements a Abidjan",
          },
          {
            src: "/screenshots/screenshot-report.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            platform: "android",
            label: "Signalements confirmes par les voisins",
          },
        ],
        launch_handler: {
          client_mode: "focus-existing",
        },
        share_target: {
          action: "/signaler",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
        // Handle web+signa:// protocol for deep linking (e.g. web+signa://signalement/ID)
        protocol_handlers: [
          {
            protocol: "web+signa",
            url: "/?protocol=%s",
          },
        ],
        // Handle image files shared to the app (for adding photos to reports)
        file_handlers: [
          {
            action: "/signaler",
            accept: {
              "image/png":  [".png"],
              "image/jpeg": [".jpg", ".jpeg"],
              "image/webp": [".webp"],
            },
          },
        ],
        shortcuts: [
          {
            name: "Faire un signalement",
            short_name: "Signaler",
            description: "Signalez une coupure ou un probleme d'infrastructure",
            url: "/signaler?source=shortcut",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Voir la carte",
            short_name: "Carte",
            description: "Carte live des signalements a Abidjan",
            url: "/carte?source=shortcut",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Mon historique",
            short_name: "Historique",
            description: "Suivre mes signalements",
            url: "/historique?source=shortcut",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
}));
