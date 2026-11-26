import { useEffect, useRef, useState } from 'react';
import { localCounterReady } from '../lib/counter-runtime.ts';
import { COUNTER_MODES } from '../lib/counter-routing.ts';
import type { ImageEngine } from '../lib/counter-routing.ts';
import { MODE_LABELS } from '../lib/dashboard.ts';
import type { ProcessingMode } from '../lib/dashboard.ts';
import type { ImageAnalysis } from '../lib/image-analysis.ts';
import { actualImageRoute, checkCounterService } from '../lib/network-status.ts';
import type { CounterServiceCheck } from '../lib/network-status.ts';

export default function NetworkStatus({ engine, mode, analysis, disabled = false }: {
  engine: ImageEngine; mode: ProcessingMode; analysis?: ImageAnalysis; disabled?: boolean;
}) {
  const [online, setOnline] = useState(navigator.onLine);
  const [check, setCheck] = useState<CounterServiceCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const changed = () => {
      active.current?.abort();
      setOnline(navigator.onLine);
      setCheck(null);
      setChecking(false);
    };
    window.addEventListener('online', changed);
    window.addEventListener('offline', changed);
    return () => {
      active.current?.abort();
      window.removeEventListener('online', changed);
      window.removeEventListener('offline', changed);
    };
  }, []);

  async function probe() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setChecking(true);
    setCheck(null);
    try {
      const result = await checkCounterService(controller.signal);
      if (!controller.signal.aborted) setCheck(result);
    } catch {
      // A connection change or unmount cancels the check without reporting an outage.
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }

  return <section className="panel network-panel" aria-label="Network and processing">
    <div className="panel-title"><div><h2>Network & processing</h2><p>Connection, service response and computed source are separate checks.</p></div></div>
    <dl className="network-facts">
      <div><dt>Browser connection hint</dt><dd>{online ? 'Reports connected' : 'Reports offline'}</dd><small>This signal alone does not verify internet or service access.</small></div>
      <div><dt>Bead counting service</dt><dd role="status">{checking ? 'Checking…' : check ? check.status === 'reachable' ? 'Responded at last check' : 'Not verified at last check' : 'Not checked'}</dd>
        <small>{check ? check.message : 'Use the check button to test this host’s counting endpoint.'}</small>
        {check && <small><time dateTime={check.checkedAt}>{new Date(check.checkedAt).toLocaleString()}</time> · {check.elapsedMs} ms</small>}</div>
      <div><dt>Local counter support</dt><dd>{localCounterReady() ? 'Browser APIs available' : 'Required browser APIs unavailable'}</dd><small>Capability check only. Full disconnected reopening is a separate test.</small></div>
      <div><dt>Records</dt><dd>This browser</dd><small>Photos and results stay in local browser storage. Shared database sync is not connected.</small></div>
    </dl>
    <div className="network-route"><strong>Selected preference:</strong> {(engine === 'bead_cv' ? COUNTER_MODES : MODE_LABELS)[mode]}
      <p><strong>Actual last count:</strong> {actualImageRoute(analysis)}{analysis && <> · <time dateTime={analysis.createdAt}>{new Date(analysis.createdAt).toLocaleString()}</time></>}</p>
      <p>{engine === 'bead_cv' ? 'A hosted count sends a reduced pixel copy. A browser-worker count sends no image to the service.' : 'Optional Firebase adapter selected. The bead-service check does not verify Firebase or its local model.'}</p>
    </div>
    <div className="network-check"><button className="button secondary" disabled={checking || disabled} onClick={() => { void probe(); }}>{checking ? 'Checking service…' : 'Check bead service'}</button><span>Metadata request only · no photo upload · no model request</span></div>
  </section>;
}
