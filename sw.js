// Health RPG 서비스 워커 — 설치 가능 조건 충족 + 가벼운 오프라인 지원.
// 전략: 네트워크 우선, 실패 시 캐시 (새 배포가 항상 우선 적용되도록)
const CACHE = 'hrpg-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then(hit => hit ?? Promise.reject(new Error('offline'))))
  );
});
