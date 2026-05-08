import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Al Deen",
        short_name: "Al Deen",
        description: "Access to Quran, Hadith and etc.",
        theme_color: "#1a1a1a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,json}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB for large font files
        runtimeCaching: [
          {
            // Quran JSON data files — cache forever, they rarely change
            urlPattern: /\/Layer\/Bottom\/Data\/.+\.json$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "quran-data-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Quran font files
            urlPattern: /\/Layer\/Top\/Asset\/Font\/.+\.(woff2?|ttf|eot)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
            },
          },
          {
            // Quran audio files
            urlPattern: /\/Layer\/Bottom\/Data\/Quran\/Audio\/.+\.mp3$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "audio-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              rangeRequests: true,
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.alquran\.cloud\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            // Prayer times API — stale-while-revalidate for fast repeat loads
            urlPattern: /^https:\/\/api\.aladhan\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "prayer-times-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 6, // 6 hours
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./Layer"),
    },
  },
}));
