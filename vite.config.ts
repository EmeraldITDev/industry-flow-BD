import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Emits /version.json with a per-build id, and serves it in dev.
function buildVersionPlugin(): Plugin {
  const version = `${Date.now()}`;
  const body = JSON.stringify({ version, builtAt: new Date().toISOString() });
  return {
    name: "build-version-json",
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(body);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: body });
    },
  };
}

const API_ORIGIN = (
  process.env.VITE_API_URL ||
  process.env.VITE_API_BASE_URL ||
  "https://industry-flow-backend.onrender.com"
).replace(/\/$/, "");

function resolveApiHostname(): string {
  try {
    return new URL(API_ORIGIN).hostname;
  } catch {
    return "industry-flow-backend.onrender.com";
  }
}

const API_HOST = resolveApiHostname();

/** Scope cache entries per Authorization header so users don't share offline data. */
const authScopedCachePlugin = {
  cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
    const auth = request.headers.get("Authorization") ?? "anonymous";
    return `${request.url}|${auth}`;
  },
};

const networkFirstBase = {
  networkTimeoutSeconds: 10,
  cacheableResponse: { statuses: [0, 200] as number[] },
  plugins: [authScopedCachePlugin],
};

function isApiGet(url: URL, request: Request): boolean {
  return (
    request.method === "GET" &&
    url.hostname === API_HOST &&
    url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/api/auth")
  );
}

function isFinancialApi(pathname: string): boolean {
  return pathname === "/api/projects" || pathname.startsWith("/api/projects/");
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    buildVersionPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "robots.txt", "pwa-*.png"],
      manifest: {
        id: "/",
        name: "Emerald BDPortal",
        short_name: "BDPortal",
        description:
          "Industrial project management and business development portal for Emerald CFZE.",
        theme_color: "#39ADAA",
        background_color: "#0F4A5C",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "any",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-192x192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,json}"],
        // Main bundle is ~2.7 MB; default 2 MiB precache cap would skip it.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Static media served from the app origin (images, fonts)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-media-v1",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-v1",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Financial / project data — short TTL (5 min), NetworkFirst
          {
            urlPattern: ({ url, request }) =>
              isApiGet(url, request) && isFinancialApi(url.pathname),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "api-financial-v1",
              expiration: { maxEntries: 80, maxAgeSeconds: 5 * 60 },
              ...networkFirstBase,
            },
          },
          // Other API GET — NetworkFirst, longer offline fallback
          {
            urlPattern: ({ url, request }) => isApiGet(url, request),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "api-general-v1",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 },
              ...networkFirstBase,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
