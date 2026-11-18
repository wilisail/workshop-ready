import { buildPrompt, parseOrganizedNotes, resolveSource } from './notes.ts';
import type { InferenceModeChoice, NoteResult } from './notes.ts';
import type { FirebaseSettings } from './storage.ts';

const checkedApps = new Set<string>();
export type LocalAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown';

export async function checkLocalAvailability(): Promise<LocalAvailability> {
  const api = (globalThis as unknown as { LanguageModel?: { availability(options: unknown): Promise<string> } }).LanguageModel;
  if (!api?.availability) return 'unavailable';
  try {
    const value = await api.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] });
    return ['available', 'downloadable', 'downloading', 'unavailable'].includes(value) ? value as LocalAvailability : 'unknown';
  } catch { return 'unknown'; }
}

export async function organizeNotes(
  note: string,
  mode: InferenceModeChoice,
  settings: FirebaseSettings,
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<NoteResult> {
  const prompt = buildPrompt(note);
  const debug = import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG === 'true';
  if (!settings.siteKey.trim() && !debug) throw new Error('Add your App Check reCAPTCHA Enterprise site key in Firebase settings.');
  if (mode === 'cloud' && !navigator.onLine) throw new Error('You are offline. Your draft is saved. Reconnect for cloud processing, or use a prepared compatible device for local inference.');
  const start = performance.now();
  onProgress(mode === 'cloud' ? 'Connecting to Firebase…' : 'Checking local inference…');
  const [appSDK, appCheckSDK, aiSDK] = await Promise.all([import('firebase/app'), import('firebase/app-check'), import('firebase/ai')]);
  signal.throwIfAborted();
  const name = `workshop-ready-${settings.config.projectId}`;
  const app = appSDK.getApps().find(item => item.name === name) || appSDK.initializeApp(settings.config, name);
  if (!checkedApps.has(name)) {
    if (debug) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    appCheckSDK.initializeAppCheck(app, {
      provider: new appCheckSDK.ReCaptchaEnterpriseProvider(settings.siteKey || 'localhost-debug-only'),
      isTokenAutoRefreshEnabled: true,
    });
    checkedApps.add(name);
  }
  const ai = aiSDK.getAI(app, { backend: new aiSDK.GoogleAIBackend() });
  const model = aiSDK.getGenerativeModel(ai, {
    mode: mode === 'cloud' ? aiSDK.InferenceMode.ONLY_IN_CLOUD : mode === 'local' ? aiSDK.InferenceMode.ONLY_ON_DEVICE : aiSDK.InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: settings.model,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 768,
        responseMimeType: 'application/json',
        responseSchema: aiSDK.Schema.object({
          properties: {
            ready: aiSDK.Schema.array({ items: aiSDK.Schema.string() }),
            blocked: aiSDK.Schema.array({ items: aiSDK.Schema.string() }),
            nextActions: aiSDK.Schema.array({ items: aiSDK.Schema.string() }),
          },
        }),
      },
    },
    onDeviceParams: { createOptions: { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] } },
  }, { timeout: 45000 });

  if (mode !== 'cloud') {
    // Only an explicit Generate click in a local-capable mode can initiate a model download.
    const preparing = model.initializeDeviceModel(progress => {
      if (!signal.aborted) onProgress(`Preparing local model: ${Math.round(progress * 100)}%`);
    });
    if (mode === 'local') await preparing;
    else void preparing.catch(() => { /* Firebase performs the selected cloud fallback. */ });
  }
  signal.throwIfAborted();
  onProgress(mode === 'cloud' ? 'Organizing in the cloud…' : 'Organizing your notes…');
  const { response } = await model.generateContent(prompt, { signal });
  signal.throwIfAborted();
  return {
    ...parseOrganizedNotes(response.text()),
    source: resolveSource(response.inferenceSource, mode),
    elapsedMs: performance.now() - start,
    createdAt: new Date().toISOString(),
    input: note,
  };
}

export function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'Stopped waiting for a response. Your draft is safe. A cloud request already sent may still finish on the server.';
    if (/403|app.?check|permission.denied/i.test(error.message)) return 'Firebase rejected this request. Check App Check, the allowed site domain and project setup. Your draft is safe.';
    if (/429|quota|resource.exhausted/i.test(error.message)) return 'The cloud usage limit was reached. Your draft is safe; wait and try again.';
    if (/unavailable|not supported|on.device.*not/i.test(error.message)) return 'The local model is unavailable in this browser. Use Cloud mode, or prepare a compatible device.';
    return error.message.slice(0, 420);
  }
  return 'Something interrupted the request. Your draft is safe; try again.';
}

