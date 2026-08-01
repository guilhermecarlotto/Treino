/* Service worker do app de Treinos
   Objetivo: abrir sem internet, mas sempre pegar a versao mais nova quando houver rede.
   Os dados dos treinos NAO passam por aqui (ficam em localStorage/IndexedDB). */

const VERSION = 'treinos-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Instala: baixa o "esqueleto" do app e guarda no cache.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        // cache: 'reload' evita pegar uma copia velha do cache HTTP do navegador
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {
        // um arquivo que falhou nao pode impedir a instalacao
      }
    }));
    self.skipWaiting();
  })());
});

// Ativa: apaga caches de versoes anteriores e assume o controle das abas abertas.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === VERSION ? null : caches.delete(k))));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

// Permite forcar a atualizacao a partir da pagina: navigator.serviceWorker.controller.postMessage('skip-waiting')
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // So mexe em GET do proprio site; o resto passa direto.
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  // Abertura do app (navegacao): tenta a rede primeiro para sempre pegar a versao
  // mais nova; sem internet, cai para a copia salva.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloaded = await event.preloadResponse;
        const res = preloaded || await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(VERSION);
          cache.put('index.html', res.clone());
        }
        return res;
      } catch (e) {
        const cache = await caches.open(VERSION);
        return (await cache.match('index.html'))
          || (await cache.match('./'))
          || new Response(
            '<meta charset="utf-8"><p style="font-family:sans-serif;padding:24px">Sem internet e sem copia salva. Abra o app uma vez com internet.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
      }
    })());
    return;
  }

  // Demais arquivos (icone, manifest): responde do cache na hora e atualiza por tras.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
