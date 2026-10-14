/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages publica el proyecto en https://carlosbotella.github.io/ayudaClases/
// El nombre debe coincidir EXACTAMENTE (mayúsculas incluidas) con el del repositorio.
const BASE = '/ayudaClases/';

export default defineConfig({
  base: BASE,
  define: {
    // Fecha de compilación: se muestra pequeña en la portada para comprobar
    // de un vistazo que la tablet tiene la última versión publicada.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Viaje Lector',
        short_name: 'Viaje Lector',
        description: 'Juegos para aprender a leer y escribir, paso a paso.',
        lang: 'es',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'landscape',
        start_url: BASE,
        scope: BASE,
        background_color: '#FFF8EC',
        theme_color: '#2F8F83',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precaché del "shell": todo lo que genera el build (JS, CSS, fuentes, iconos).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Pictogramas de ARASAAC: una vez vistos, se sirven siempre desde la caché.
            urlPattern: ({ url }) => url.origin === 'https://static.arasaac.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'pictogramas-arasaac',
              expiration: {
                maxEntries: 3000,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              // Las imágenes llegan sin CORS (respuesta "opaca", status 0): también se guardan.
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Firebase y las animaciones en trozos aparte: se cachean por separado
        // y una actualización de la app no obliga a volver a bajarlos.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          animacion: ['framer-motion', '@dnd-kit/core'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
