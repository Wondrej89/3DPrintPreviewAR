import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this project site below /3DPrintPreviewAR/.
const base = '/3DPrintPreviewAR/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        id: './',
        name: 'PrintScope AR – 3D Print Viewer',
        short_name: 'PrintScope',
        description: 'Lokální analýza tisknutelnosti a AR náhled modelů',
        theme_color: '#07111e',
        background_color: '#07111e',
        display: 'standalone',
        start_url: './',
        scope: './',
        orientation: 'any',
        // SVG remains sharp at every launcher size and keeps this repository
        // text-only for patch-based pull-request tooling.
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
