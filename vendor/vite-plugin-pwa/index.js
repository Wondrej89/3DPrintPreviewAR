export function VitePWA(options = {}) {
  return {
    name: 'vite-plugin-pwa',
    generateBundle() {
      if (options.manifest) {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.webmanifest',
          source: JSON.stringify(options.manifest),
        });
      }
    },
  };
}
