import type { InferenceModeChoice } from './notes.ts';

export const DRAFT_KEY = 'workshop-ready:draft:v1';
export const SETTINGS_KEY = 'workshop-ready:firebase:v1';
export interface FirebaseSettings {
  config: { apiKey: string; projectId: string; appId: string; authDomain?: string; messagingSenderId?: string; storageBucket?: string };
  siteKey: string;
  model: string;
}

export function readDraft(): { note: string; mode: InferenceModeChoice } {
  try {
    const data = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    return { note: typeof data.note === 'string' ? data.note : '', mode: ['cloud', 'cloud-first', 'hybrid', 'local'].includes(data.mode) ? data.mode : 'cloud' };
  } catch { return { note: '', mode: 'cloud' }; }
}

export function saveDraft(note: string, mode: InferenceModeChoice): boolean {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ note, mode, savedAt: new Date().toISOString() })); return true; }
  catch { return false; }
}

export function parseFirebaseConfig(input: string): FirebaseSettings['config'] {
  let parsed: unknown;
  try { parsed = JSON.parse(input); }
  catch { throw new Error('Paste valid JSON: { "apiKey": "…", "projectId": "…", "appId": "…" }.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Firebase configuration must be a JSON object.');
  const config = parsed as Record<string, unknown>;
  for (const key of ['apiKey', 'projectId', 'appId']) {
    if (typeof config[key] !== 'string' || !(config[key] as string).trim()) throw new Error(`Firebase configuration needs ${key}.`);
  }
  const clean: Record<string, string> = {};
  for (const key of ['apiKey', 'projectId', 'appId', 'authDomain', 'messagingSenderId', 'storageBucket']) {
    if (typeof config[key] === 'string') clean[key] = config[key].trim();
  }
  return clean as unknown as FirebaseSettings['config'];
}

export function readSettings(): FirebaseSettings | null {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      return { config: parseFirebaseConfig(JSON.stringify(settings.config)), siteKey: String(settings.siteKey || ''), model: String(settings.model || 'gemini-3.5-flash-lite') };
    }
  } catch { /* Continue to build-time public configuration. */ }
  const env = import.meta.env;
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_APP_ID) return null;
  return {
    config: { apiKey: env.VITE_FIREBASE_API_KEY, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET },
    siteKey: env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '',
    model: env.VITE_GEMINI_MODEL || 'gemini-3.5-flash-lite',
  };
}

export function storeSettings(settings: FirebaseSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
