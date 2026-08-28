const CACHE = 'daily-v1.0-shell'
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request)
        const cache = await caches.open(CACHE)
        cache.put('./index.html', fresh.clone())
        return fresh
      } catch {
        return (await caches.match(request)) || (await caches.match('./index.html')) || Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
      const fresh = await fetch(request)
      if (fresh.ok && url.pathname.includes('/assets/')) {
        const cache = await caches.open(CACHE)
        cache.put(request, fresh.clone())
      }
      return fresh
    } catch {
      return cached || Response.error()
    }
  })())
})
