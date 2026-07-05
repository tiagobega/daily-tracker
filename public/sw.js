// Minimal service worker: runtime cache for static assets (installability +
// faster loads / partial offline). Navigations and API/auth responses are NOT
// cached, to avoid serving stale authenticated HTML.
const CACHE = "daily-tracker-v1";

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
			);
			await self.clients.claim();
		})(),
	);
});

const ASSET_RE = /\.(?:js|mjs|css|woff2?|png|jpg|jpeg|svg|ico|webmanifest)$/;

self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET") return;

	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;

	const isAsset =
		url.pathname.startsWith("/_build/") ||
		url.pathname.startsWith("/assets/") ||
		ASSET_RE.test(url.pathname);
	if (!isAsset) return;

	event.respondWith(
		(async () => {
			const cached = await caches.match(req);
			if (cached) return cached;
			const res = await fetch(req);
			if (res.ok) {
				const cache = await caches.open(CACHE);
				cache.put(req, res.clone());
			}
			return res;
		})(),
	);
});
