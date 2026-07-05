import { useEffect } from 'react';

// Registers the service worker in production (enables install + asset caching).
export function PwaRegister() {
	useEffect(() => {
		if (import.meta.env.PROD && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
	}, []);
	return null;
}
