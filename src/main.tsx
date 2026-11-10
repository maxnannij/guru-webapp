import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function clearLegacySiteData() {
  try {
    // Borra datos que versiones anteriores de Gurú Box pudieron guardar.
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch (error) {
    console.warn('No se pudo limpiar el almacenamiento local:', error);
  }

  try {
    // Desregistra service workers antiguos y elimina sus cachés persistentes.
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ('caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map(cacheName => window.caches.delete(cacheName)));
    }
  } catch (error) {
    console.warn('No se pudieron limpiar las cachés locales:', error);
  }
}

async function startApp() {
  await clearLegacySiteData();
  createRoot(document.getElementById('root')!).render(<App />);
}

void startApp();
