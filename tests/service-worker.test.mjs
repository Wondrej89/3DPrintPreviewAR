import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const handlers = {};
const entries = new Map();
let online = true;
let serverBody = '/* version A */';
const key = request => typeof request === 'string' ? request : request.url;
const cache = {
  addAll: async () => {},
  match: async request => entries.get(key(request))?.clone(),
  put: async (request, response) => entries.set(key(request), response)
};
const context = {
  URL,
  Request,
  Error,
  caches: {
    open: async () => cache,
    match: cache.match,
    keys: async () => [],
    delete: async () => true
  },
  fetch: async () => {
    if (!online) throw new TypeError('offline');
    return new Response(serverBody, {status: 200});
  },
  self: {
    location: {origin: 'https://app.test'},
    addEventListener: (type, handler) => { handlers[type] = handler; },
    skipWaiting: async () => {},
    clients: {claim: async () => {}}
  }
};

vm.runInNewContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), context);

async function loadStyles() {
  let responsePromise;
  handlers.fetch({
    request: new Request('https://app.test/styles.css'),
    respondWith: promise => { responsePromise = promise; }
  });
  return (await responsePromise).text();
}

assert.equal(await loadStyles(), '/* version A */', 'the first online response should load version A');
serverBody = '/* version B */';
assert.equal(await loadStyles(), '/* version B */', 'an online request must not reuse cached version A');
online = false;
assert.equal(await loadStyles(), '/* version B */', 'offline fallback should return the last successful response');
assert.equal(await (await entries.get('https://app.test/styles.css')).text(), '/* version B */', 'version B should replace version A in Cache Storage');

console.log('Service Worker network-first update scenario passed.');
