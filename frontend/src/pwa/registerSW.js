// This will be used in main.tsx or App.tsx to register the service worker
import { registerSW } from 'virtual:pwa-register';

export const setupPWA = () => {
    const updateSW = registerSW({
        onNeedRefresh() {
            if (confirm('New content available. Reload?')) {
                updateSW(true);
            }
        },
        onOfflineReady() {
            console.log('App ready to work offline');
        },
    });
};
