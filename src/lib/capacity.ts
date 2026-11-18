import type { InferenceModeChoice } from './notes.ts';

export type LocalAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown';
export interface BrowserCapacity {
  approximateMemoryGiB: number | null;
  logicalProcessors: number | null;
  storageUsageBytes: number | null;
  storageQuotaBytes: number | null;
  availableSystemMemory: null;
  localModel: LocalAvailability;
  onlineHint: boolean;
  checkedAt: string;
}
export interface RoutingPlan {
  mode: InferenceModeChoice;
  prepareDevice: boolean;
  explanation: string;
}

export async function checkLocalAvailability(): Promise<LocalAvailability> {
  const api = (globalThis as unknown as { LanguageModel?: { availability(options: unknown): Promise<string> } }).LanguageModel;
  if (!api?.availability) return 'unavailable';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      api.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }),
      new Promise<string>(resolve => { timer = setTimeout(() => resolve('unknown'), 2500); }),
    ]);
    return ['available', 'downloadable', 'downloading', 'unavailable'].includes(value) ? value as LocalAvailability : 'unknown';
  } catch { return 'unknown'; }
  finally { if (timer) clearTimeout(timer); }
}

export async function readBrowserCapacity(): Promise<BrowserCapacity> {
  const reportedMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  let storage: StorageEstimate = {};
  try { storage = await navigator.storage?.estimate() || {}; } catch { /* Unknown quota remains unknown. */ }
  return {
    approximateMemoryGiB: typeof reportedMemory === 'number' && reportedMemory > 0 ? reportedMemory : null,
    logicalProcessors: navigator.hardwareConcurrency || null,
    storageUsageBytes: typeof storage.usage === 'number' ? storage.usage : null,
    storageQuotaBytes: typeof storage.quota === 'number' ? storage.quota : null,
    availableSystemMemory: null,
    localModel: await checkLocalAvailability(),
    onlineHint: navigator.onLine,
    checkedAt: new Date().toISOString(),
  };
}

export function planRoute(requested: InferenceModeChoice, local: LocalAvailability, online: boolean): RoutingPlan {
  if (requested === 'cloud') {
    if (!online) throw new Error('Cloud-only needs internet. Your draft is safe; reconnect or choose a prepared local model.');
    return { mode: 'cloud', prepareDevice: false, explanation: 'Cloud-only was selected. No local model was initialized.' };
  }
  if (requested === 'local') {
    if (local === 'unavailable' || local === 'unknown') throw new Error('Local-only cannot run: this browser has no confirmed supported local model. No cloud request was made.');
    if (!online && local !== 'available') throw new Error('Local-only cannot prepare an undownloaded model while offline. No cloud request was made.');
    return { mode: 'local', prepareDevice: true, explanation: local === 'available' ? 'Local-only was selected; cloud fallback is disabled.' : 'Local-only was selected. This explicit request may download the browser model.' };
  }
  if (!online) {
    if (local === 'available') return { mode: 'local', prepareDevice: true, explanation: 'The browser reports offline; the downloaded local model will be used without cloud fallback.' };
    throw new Error('No inference route is ready: the browser reports offline and the local model is not available. Your draft is safe.');
  }
  if (local !== 'available') return {
    mode: 'cloud', prepareDevice: false,
    explanation: local === 'unavailable' ? 'The browser reports local inference unavailable, so cloud processing was selected.' : 'The local model is not confirmed ready, so cloud processing was selected without starting a model download.',
  };
  return {
    mode: requested, prepareDevice: true,
    explanation: requested === 'cloud-first' ? 'Cloud is preferred; the downloaded local model is prepared as a fallback.' : 'The downloaded local model is preferred; cloud fallback is allowed.',
  };
}

export function formatCapacityBytes(bytes: number | null): string {
  if (bytes === null) return 'Not exposed';
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GiB` : `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}
