import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerOfflineSupport } from './lib/offline.ts';
import './styles.css';
import './notes.css';
import './qa.css';
import './studies.css';
import './models.css';
import './inspection.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const prepare = () => { void registerOfflineSupport().catch(() => window.dispatchEvent(new Event('workshop-offline-change'))); };
  window.addEventListener('load', prepare);
  window.addEventListener('online', prepare);
}
