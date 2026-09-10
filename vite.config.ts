import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  base: '/3DPrintPreviewAR/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'PrintScope AR – 3D Print Viewer',
        short_name: 'PrintScope',
        description: 'Lokální analýza tisknutelnosti a AR náhled modelů',
        theme_color: '#07111e',
        background_color: '#07111e',
        display: 'standalone',
        start_url: '/3DPrintPreviewAR/',
        scope: '/3DPrintPreviewAR/',
        orientation: 'any',
        icons: [{
          src: 'icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        }],
      },
      workbox: {globPatterns: ['**/*.{js,css,html,svg,woff2}']},
    }),
  ],
});
