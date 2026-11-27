export interface OfflineReadiness {
  phase: 'ready' | 'missing' | 'outdated' | 'unavailable' | 'unsupported';
  message: string;
  checkedAt?: string;
  build?: string;
  assetCount?: number;
  missingCount?: number;
}

export function parseOfflineReply(raw: unknown, expectedBuild: string): OfflineReadiness {
  const value = raw as Record<string, unknown> | null;
  if (!value || value.schema !== 'offline-assets-v1' || typeof value.build !== 'string' ||
      !/^[a-f0-9]{12}$/.test(value.build) || !Number.isInteger(value.assetCount) ||
      (value.assetCount as number) < 4 || (value.assetCount as number) > 200 ||
      !Number.isInteger(value.missingCount) || (value.missingCount as number) < 0 ||
      (value.missingCount as number) > (value.assetCount as number) || typeof value.workerReady !== 'boolean') {
    return { phase: 'unavailable', message: 'Offline assets could not be confirmed. Connect and prepare this browser again.' };
  }
  const evidence = { checkedAt: new Date().toISOString(), build: value.build, assetCount: value.assetCount as number, missingCount: value.missingCount as number };
  if (value.build !== expectedBuild) return { ...evidence, phase: 'outdated', message: 'A different app version is prepared. Refresh while connected, then check again.' };
  if (value.missingCount !== 0 || !value.workerReady) return { ...evidence, phase: 'missing', message: 'Some required app assets are missing. Connect and prepare this browser again.' };
  return { ...evidence, phase: 'ready', message: 'This app version and its small counting worker are saved on this browser.' };
}

export async function queryOfflineWorker(worker: Pick<ServiceWorker, 'postMessage'>, expectedBuild: string, prepare: boolean, signal: AbortSignal, timeoutMs = 4000): Promise<OfflineReadiness> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const clean = () => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); signal.removeEventListener('abort', abort); };
    const abort = () => { clean(); reject(signal.reason); };
    const timer = setTimeout(() => { clean(); resolve({ phase: 'unavailable', message: 'The offline check did not respond. Keep this page open while connected, then retry.' }); }, timeoutMs);
    signal.addEventListener('abort', abort, { once: true });
    channel.port1.onmessage = event => { clean(); resolve(parseOfflineReply(event.data, expectedBuild)); };
    try { worker.postMessage({ schema: 'offline-assets-request-v1', expectedBuild, prepare }, [channel.port2]); }
    catch { clean(); resolve({ phase: 'unavailable', message: 'This browser could not check its saved app assets.' }); }
  });
}

let registering: Promise<ServiceWorkerRegistration | undefined> | undefined;
const changed = () => window.dispatchEvent(new Event('workshop-offline-change'));
export function registerOfflineSupport(): Promise<ServiceWorkerRegistration | undefined> {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !navigator.onLine) return Promise.resolve(undefined);
  return registering ??= navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
    registration.installing?.addEventListener('statechange', changed);
    return registration;
  }).finally(() => { registering = undefined; });
}

export async function readOfflineReadiness(prepare: boolean, signal: AbortSignal): Promise<OfflineReadiness> {
  const expectedBuild = document.querySelector<HTMLMetaElement>('meta[name="offline-build"]')?.content;
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window)) return { phase: 'unsupported', message: 'Offline app preparation needs a supported browser on HTTPS or localhost.' };
  if (!expectedBuild) return { phase: 'unsupported', message: 'Offline preparation is available in the built or deployed app.' };
  if (prepare && navigator.onLine) {
    // An update failure must not turn a previously prepared offline copy into a false failure.
    try { await registerOfflineSupport(); } catch { /* Check the active copy independently below. */ }
  }
  signal.throwIfAborted();
  const worker = navigator.serviceWorker.controller;
  if (!worker) return { phase: 'missing', message: 'Keep this page open while connected until preparation finishes, then check again.' };
  return queryOfflineWorker(worker, expectedBuild, prepare && navigator.onLine, signal, prepare ? 20000 : 4000);
}
