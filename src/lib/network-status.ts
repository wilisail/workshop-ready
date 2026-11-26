import { COUNTER_VERSION, MAX_COUNTER_SIDE } from './bead-counter.ts';
import type { ImageAnalysis } from './image-analysis.ts';

export interface CounterServiceCheck {
  status: 'reachable' | 'unavailable' | 'unexpected';
  checkedAt: string;
  elapsedMs: number;
  message: string;
  runtime?: 'vercel-node' | 'node-preview';
}

/** Metadata only: never sends a photo or starts an inference/model request. */
export async function checkCounterService(
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  timeoutMs = 8000,
): Promise<CounterServiceCheck> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const start = performance.now();
  const finish = (result: Omit<CounterServiceCheck, 'checkedAt' | 'elapsedMs'>): CounterServiceCheck => ({
    ...result, checkedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start),
  });
  try {
    const response = await fetcher('/api/count-image', {
      method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal,
    });
    signal.throwIfAborted();
    if (!response.ok) return finish({ status: 'unavailable', message: `Counting service returned HTTP ${response.status}.` });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return finish({ status: 'unexpected', message: 'This host returned a page instead of counting-service metadata.' });
    }
    const raw = await response.json();
    signal.throwIfAborted();
    if (!raw || raw.engine !== 'bead_cv' || raw.version !== COUNTER_VERSION || raw.maxSide !== MAX_COUNTER_SIDE ||
        !Array.isArray(raw.kinds) || raw.kinds.length !== 1 || raw.kinds[0] !== 'bead_proxy' ||
        !['vercel-node', 'node-preview'].includes(raw.runtime)) {
      return finish({ status: 'unexpected', message: 'Service metadata does not match this counter version. Recheck after refreshing the app.' });
    }
    return finish({ status: 'reachable', runtime: raw.runtime,
      message: raw.runtime === 'vercel-node' ? 'Vercel counting service responded.' : 'Development counting service responded; this is not the Vercel runtime.' });
  } catch {
    signal.throwIfAborted();
    return finish({ status: 'unavailable', message: timedOut ? 'Counting-service check timed out.' : 'Could not verify the counting service from this browser.' });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

/** Runtime comes from the retained result, never from the selected preference. */
export function actualImageRoute(analysis?: ImageAnalysis): string {
  if (!analysis) return 'No computed result selected';
  if (analysis.execution === 'vercel-function') return 'Vercel function';
  if (analysis.execution === 'development-server') return 'Development Node service';
  if (analysis.execution === 'browser-worker') return 'This browser’s worker';
  return analysis.source === 'device' ? 'Device (reported by optional adapter)' : 'Cloud (reported by optional adapter)';
}
