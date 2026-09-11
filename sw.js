const CACHE_PREFIX = 'printscope-';
const CACHE = `${CACHE_PREFIX}v0.3.10`;
const FILES = [
  './',
  './index.html',
  './styles.css',
  './version.json',
  './manifest.webmanifest',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-maskable-512.svg',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/STLLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/3MFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/fflate.module.js',
  './js/app.js',
  './js/pwa/install.js',
  './js/state.js',
  './js/model/load-model.js',
  './js/model/units.js',
  './js/model/orientation.js',
  './js/viewer/scene.js',
  './js/analysis/fit.js',
  './js/analysis/overhang.js',
  './js/analysis/bed-contact.js',
  './js/analysis/mesh-validation.js',
  './js/workers/mesh-analysis.worker.js',
  './js/storage/db.js',
  './js/ar/ar.js',
  './js/shaders/heatmap.js',
  './js/data/printers.js',
  './js/data/materials.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(new Request(request, {cache: 'no-store'}));
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw new Error('Síť ani cache nejsou dostupné.');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  event.respondWith(url.origin === self.location.origin ? networkFirst(event.request) : cacheFirst(event.request));
});
