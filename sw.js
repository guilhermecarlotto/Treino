/* Service worker do app de Treinos
   Objetivo: abrir sem internet, mas sempre pegar a versao mais nova quando houver rede.
   Os dados dos treinos NAO passam por aqui (ficam em localStorage/IndexedDB + nuvem). */

const VERSION = 'treinos-v3';
const ASSETS = [
  './',
  'index.html',
  'comum.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];
// biblioteca do Firebase (login + nuvem). Guardada no cache pra o app conseguir abrir e
// reconhecer o login mesmo sem internet. Os endereços têm a versão no caminho (nunca mudam).
const FIREBASE_SDK = /^https:\/\/www\.gstatic\.com\/firebasejs\//;

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

// rede primeiro (pra sempre pegar a versao mais nova); sem internet, cai pra copia salva
async function networkFirst(req, key, preload) {
  const cache = await caches.open(VERSION);
  try {
    // cache:'no-cache' = sempre revalida com o servidor (senao o cache HTTP do navegador/GitHub
    // Pages podia entregar um comum.js antigo por varios minutos)
    const res = (preload && await preload) || await fetch(req, { cache: 'no-cache' });
    if (res && res.ok) cache.put(key || req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(key || req, { ignoreSearch: true })) || null;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // biblioteca do Firebase: cache primeiro (versao fixa no endereco), atualiza por tras
  if (FIREBASE_SDK.test(req.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
    return;
  }

  // O resto de fora do site (Firestore, login) passa direto.
  if (url.origin !== self.location.origin) return;

  // Abertura do app (navegacao): rede primeiro; sem internet, a copia salva.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const res = await networkFirst(req, 'index.html', event.preloadResponse);
      if (res) return res;
      const cache = await caches.open(VERSION);
      return (await cache.match('./'))
        || new Response(
          '<meta charset="utf-8"><p style="font-family:sans-serif;padding:24px">Sem internet e sem copia salva. Abra o app uma vez com internet.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    })());
    return;
  }

  // Codigo (comum.js e outros .js): rede primeiro tambem — tem que andar junto com a
  // versao do index.html; se pegasse do cache antes, podia misturar versao nova com velha.
  if (/\.js$/.test(url.pathname)) {
    event.respondWith((async () => (await networkFirst(req)) || Response.error())());
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
