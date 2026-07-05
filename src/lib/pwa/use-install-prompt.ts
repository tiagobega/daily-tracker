import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Captures the browser's install prompt (Android/Chrome) and detects iOS/standalone.
export function useInstallPrompt() {
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
		null,
	);
	const [installed, setInstalled] = useState(false);

	useEffect(() => {
		const onPrompt = (e: Event) => {
			e.preventDefault();
			setDeferred(e as BeforeInstallPromptEvent);
		};
		const onInstalled = () => {
			setInstalled(true);
			setDeferred(null);
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		if (window.matchMedia('(display-mode: standalone)').matches) {
			setInstalled(true);
		}
		return () => {
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	}, []);

	const isIOS =
		typeof navigator !== 'undefined' &&
		/iphone|ipad|ipod/i.test(navigator.userAgent);

	async function promptInstall() {
		if (!deferred) return;
		await deferred.prompt();
		setDeferred(null);
	}

	return { canInstall: deferred !== null, installed, isIOS, promptInstall };
}
