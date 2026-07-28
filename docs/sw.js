/* Service worker devre disi — kendini kaldirir ve tum onbellegi siler */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
{
    e.waitUntil((async () =>
    {
        const adlar = await caches.keys();
        await Promise.all(adlar.map(a => caches.delete(a)));
        await self.registration.unregister();
        const clientler = await self.clients.matchAll();
        clientler.forEach(c => c.navigate(c.url));
    })());
});
