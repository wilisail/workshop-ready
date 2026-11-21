import type { ProcessingMode } from './dashboard.ts';
export type ImageEngine = 'bead_cv' | 'firebase';
export const ENGINE_KEY = 'wolbachia-field-review:image-engine:v1';
export const COUNTER_MODES: Record<ProcessingMode, string> = {
  cloud: 'Vercel only', 'cloud-first': 'Prefer Vercel, allow browser fallback',
  hybrid: 'Prefer this device, allow Vercel fallback', local: 'This device only — no image upload',
};
export function readImageEngine(): ImageEngine { try { return localStorage.getItem(ENGINE_KEY) === 'firebase' ? 'firebase' : 'bead_cv'; } catch { return 'bead_cv'; } }
export function saveImageEngine(engine: ImageEngine) { try { localStorage.setItem(ENGINE_KEY, engine); } catch { /* The selected engine still works for this visit. */ } }
export class CounterIntegrityError extends Error {}
export async function executeCounterRoute<T>(mode: ProcessingMode, online: boolean, localReady: boolean, server: () => Promise<T>, device: () => Promise<T>, signal: AbortSignal): Promise<{ value: T; used: 'cloud' | 'device'; fallback: boolean }> {
  signal.throwIfAborted();
  if (mode === 'local' && !localReady) throw new Error('This browser cannot start the local image worker. No cloud request was made.');
  if (mode === 'cloud' && !online) throw new Error('Vercel-only needs an internet connection. Choose this-device mode for local counting.');
  if (!online && !localReady) throw new Error('No counting route is available while offline. Human review remains available.');
  const first = mode === 'local' || !online || mode === 'hybrid' && localReady ? 'device' : 'cloud';
  try { const value = await (first === 'cloud' ? server() : device()); signal.throwIfAborted(); return { value, used: first, fallback: false }; }
  catch (error) {
    signal.throwIfAborted();
    if (error instanceof CounterIntegrityError || mode === 'local' || mode === 'cloud' || first === 'device' && !online || first === 'cloud' && !localReady) throw error;
    const value = await (first === 'cloud' ? device() : server()); signal.throwIfAborted();
    return { value, used: first === 'cloud' ? 'device' : 'cloud', fallback: true };
  }
}
