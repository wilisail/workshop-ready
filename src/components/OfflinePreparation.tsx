import { useEffect, useRef, useState } from 'react';
import { readOfflineReadiness } from '../lib/offline.ts';
import type { OfflineReadiness } from '../lib/offline.ts';

export default function OfflinePreparation() {
  const [result, setResult] = useState<OfflineReadiness | null>(null);
  const [checking, setChecking] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const active = useRef<AbortController | null>(null);
  async function check(prepare = false) {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setChecking(true);
    try {
      const next = await readOfflineReadiness(prepare, controller.signal);
      if (!controller.signal.aborted) setResult(next);
    } catch {
      if (!controller.signal.aborted) setResult({ phase: 'unavailable', message: 'Offline preparation could not be checked. Connect and retry.' });
    } finally { if (!controller.signal.aborted) setChecking(false); }
  }
  useEffect(() => {
    const refresh = () => { setOnline(navigator.onLine); void check(); };
    refresh();
    navigator.serviceWorker?.addEventListener('controllerchange', refresh);
    window.addEventListener('workshop-offline-change', refresh);
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    return () => {
      active.current?.abort();
      navigator.serviceWorker?.removeEventListener('controllerchange', refresh);
      window.removeEventListener('workshop-offline-change', refresh);
      window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh);
    };
  }, []);
  return <section className="panel offline-panel" aria-label="Offline preparation">
    <div className="panel-title"><div><h2>Prepare for offline use</h2><p>Prepare once while connected, using the browser you will take with you.</p></div></div>
    <div className="settings-content">
      <p className="offline-preparation-state" role="status"><strong>{checking ? 'Checking saved app assets…' : result?.phase === 'ready' ? 'App assets prepared on this browser' : 'Offline preparation not yet confirmed'}</strong></p>
      {result && <p className="helper">{result.message}</p>}
      {result?.checkedAt && <p className="helper"><time dateTime={result.checkedAt}>{new Date(result.checkedAt).toLocaleString()}</time>{result.assetCount !== undefined && <> · {result.assetCount - (result.missingCount || 0)} / {result.assetCount} assets saved</>}</p>}
      <div className="button-row"><button className="button secondary" disabled={checking || !online} onClick={() => { void check(true); }}>Prepare offline use</button><button className="subtle-button" disabled={checking} onClick={() => { void check(); }}>Check saved assets</button>{result?.phase === 'outdated' && <button className="subtle-button" onClick={() => window.location.reload()}>Refresh app</button>}</div>
      <ol className="offline-steps"><li>Choose the small bead counter and cloud-first or device-only processing.</li><li>Once preparation is confirmed, disconnect and reopen this same app link.</li><li>Count, save a human review and export your records locally.</li></ol>
      <p className="helper">Offline counting uses the small CV worker. The optional Firebase model is separate. Keep the same browser/profile and export records for backup. Reconnecting restores permitted hosted counting; records stay local.</p>
    </div>
  </section>;
}
