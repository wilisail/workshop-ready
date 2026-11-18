import { useEffect, useRef, useState } from 'react';
import { checkLocalAvailability, friendlyError, organizeNotes } from './lib/ai.ts';
import type { LocalAvailability } from './lib/ai.ts';
import { MAX_NOTE_LENGTH, SAMPLE_NOTE, SAMPLE_RESULT, resultAsText } from './lib/notes.ts';
import type { InferenceModeChoice, NoteResult } from './lib/notes.ts';
import { parseFirebaseConfig, readDraft, readSettings, saveDraft, storeSettings } from './lib/storage.ts';
import type { FirebaseSettings } from './lib/storage.ts';

type IconName = 'note' | 'arrow' | 'check' | 'cloud' | 'device' | 'settings' | 'copy' | 'close' | 'alert' | 'download' | 'spark' | 'wifi';
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    note: <><path d="M8 4H5v17h14V4h-3"/><path d="M9 2h6v5H9zM8 12h8M8 16h5"/></>,
    arrow: <><path d="M4 12h15M13 6l6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    cloud: <path d="M6 18h12a4 4 0 0 0 .5-8A6.5 6.5 0 0 0 6 8a5 5 0 0 0 0 10Z"/>,
    device: <><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8M12 16v5"/></>,
    settings: <><path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    spark: <><path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z"/></>,
    wifi: <><path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 20h.01"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const LOCAL_LABELS: Record<LocalAvailability | 'unchecked', string> = {
  unchecked: 'Local model not checked', available: 'Local model ready', downloadable: 'Local model needs a download', downloading: 'Local model downloading', unavailable: 'Local model unavailable here', unknown: 'Local readiness could not be confirmed',
};

function Settings({ initial, onClose, onSave }: { initial: FirebaseSettings | null; onClose: () => void; onSave: (value: FirebaseSettings) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [config, setConfig] = useState(initial ? JSON.stringify(initial.config, null, 2) : '');
  const [siteKey, setSiteKey] = useState(initial?.siteKey || '');
  const [model, setModel] = useState(initial?.model || 'gemini-3.5-flash-lite');
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const settings = { config: parseFirebaseConfig(config), siteKey: siteKey.trim(), model: model.trim() };
      if (!settings.siteKey && !(import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG === 'true')) throw new Error('Add the reCAPTCHA Enterprise site key for App Check.');
      if (!settings.model) throw new Error('Add a cloud model name.');
      storeSettings(settings);
      onSave(settings);
    } catch (err) { setError(err instanceof Error ? err.message : 'Settings could not be saved.'); }
  }
  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={save}>
      <div className="dialog-title"><div><span className="eyebrow">ONE-TIME SETUP</span><h2 id="settings-title">Connect your Firebase project</h2></div><button type="button" className="icon-button" aria-label="Close settings" onClick={onClose}><Icon name="close"/></button></div>
      <p className="dialog-intro">The interface is ready. Live AI needs your Firebase web app configuration and App Check setup. These public settings stay in this browser.</p>
      <label htmlFor="firebase-config">Firebase web configuration <span>JSON</span></label>
      <textarea id="firebase-config" className="config-input" spellCheck={false} placeholder={'{\n  "apiKey": "your-web-api-key",\n  "projectId": "your-project",\n  "appId": "your-web-app-id"\n}'} value={config} onChange={event => setConfig(event.target.value)} required/>
      <label htmlFor="site-key">App Check site key</label>
      <input id="site-key" placeholder="reCAPTCHA Enterprise site key" value={siteKey} onChange={event => setSiteKey(event.target.value)}/>
      <label htmlFor="cloud-model">Cloud model</label>
      <input id="cloud-model" value={model} onChange={event => setModel(event.target.value)} required/>
      <p className="settings-hint">Enable Firebase AI Logic and enforce App Check in your project. Authorize this site's domain in reCAPTCHA Enterprise. Local development instructions are in the repository.</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="text-button" onClick={onClose}>Set up later</button><button className="primary-button" type="submit">Save settings <Icon name="arrow" size={17}/></button></div>
    </form>
  </dialog>;
}

function App() {
  const [initial] = useState(readDraft);
  const [note, setNote] = useState(initial.note);
  const [mode, setMode] = useState<InferenceModeChoice>(initial.mode);
  const [settings, setSettings] = useState<FirebaseSettings | null>(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [result, setResult] = useState<NoteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [localStatus, setLocalStatus] = useState<LocalAvailability | 'unchecked'>('unchecked');
  const [checking, setChecking] = useState(false);
  const [cacheFailed, setCacheFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const stale = Boolean(result && result.input !== note);
  useEffect(() => { setSaved(saveDraft(note, mode)); }, [note, mode]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const onCacheError = () => setCacheFailed(true);
    window.addEventListener('online', update); window.addEventListener('offline', update); window.addEventListener('workshop-cache-error', onCacheError);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('workshop-cache-error', onCacheError); };
  }, []);
  async function run() {
    setError('');
    if (!note.trim()) { setError('Add your workshop notes, or try the example first.'); return; }
    if (!settings) { setSettingsOpen(true); return; }
    const id = ++requestId.current;
    const active = new AbortController(); controller.current = active;
    setBusy(true);
    try {
      const output = await organizeNotes(note, mode, settings, active.signal, message => { if (id === requestId.current) setProgress(message); });
      if (id === requestId.current) setResult(output);
    } catch (err) { if (id === requestId.current) setError(friendlyError(err)); }
    finally { if (id === requestId.current) { setBusy(false); setProgress(''); controller.current = null; } }
  }
  function stop() {
    controller.current?.abort();
    requestId.current++;
    setBusy(false); setProgress('');
    setError('Stopped waiting. Your draft is safe. A cloud request already sent may still finish on the server.');
  }
  function loadExample() {
    setNote(SAMPLE_NOTE); setError('');
    setResult({ ...SAMPLE_RESULT, source: 'sample', elapsedMs: 0, createdAt: new Date().toISOString(), input: SAMPLE_NOTE });
  }
  async function checkDevice() { setChecking(true); setLocalStatus(await checkLocalAvailability()); setChecking(false); }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(resultAsText(result)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError('Clipboard access was blocked. Use Download instead.'); }
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([resultAsText(result)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'workshop-ready-notes.txt'; link.click(); URL.revokeObjectURL(url);
  }
  const sections = [
    { key: 'ready', title: 'Ready', subtitle: 'Already in place', icon: 'check', empty: 'Completed items will appear here.' },
    { key: 'blocked', title: 'Blocked', subtitle: 'What needs attention', icon: 'alert', empty: 'Missing items and dependencies will appear here.' },
    { key: 'nextActions', title: 'Next actions', subtitle: 'A clear way forward', icon: 'arrow', empty: 'Follow-ups, owners and stated deadlines will appear here.' },
  ] as const;
  return <>
    <header className="topbar"><a className="brand" href="/" aria-label="WorkshopReady home"><span className="brand-icon"><Icon name="note" size={23}/></span><span>Workshop<span className="brand-light">Ready</span></span></a><div className="topbar-actions"><span className={`connection ${online ? '' : 'offline'}`}><i/>{online ? 'Online' : 'Offline'}</span><button className="settings-button" onClick={() => setSettingsOpen(true)}><Icon name="settings" size={17}/><span>{settings ? 'Firebase settings' : 'Connect Firebase'}</span></button></div></header>
    <main className="app-shell">
      <section className="intro"><span className="eyebrow"><span className="tiny-line"/> LESS SORTING. MORE DOING.</span><h1>Rough notes.<br className="mobile-break"/> <em>Clear next steps.</em></h1><p>Make sense of the moving parts. Turn workshop and offsite notes<br className="desktop-break"/> into what's ready, what's blocked, and what happens next.</p></section>
      <div className="workspace">
        <section className="editor-panel" aria-labelledby="notes-heading">
          <div className="panel-heading"><div><span className="step-number">01</span><h2 id="notes-heading">Your field notes</h2></div><button className="example-button" onClick={loadExample} disabled={busy}><Icon name="spark" size={15}/> Try an example</button></div>
          <p className="panel-description">Messy is fine. Start with what you know.</p>
          <div className="textarea-wrap"><label className="sr-only" htmlFor="note-input">Workshop notes</label><textarea id="note-input" className="note-input" placeholder={'What arrived? What’s missing?\nWho is doing what, and by when?\n\nPaste your notes here…'} value={note} maxLength={MAX_NOTE_LENGTH} onChange={event => setNote(event.target.value)} disabled={busy}/><div className="textarea-footer"><span className={saved ? '' : 'save-failed'}><Icon name={saved ? 'check' : 'alert'} size={13}/>{saved ? 'Draft saved on this browser' : 'Draft could not be saved'}</span><span>{note.length.toLocaleString()} / 12,000</span></div></div>
          <div className="processing"><div className="processing-title"><span>Processing</span><span className="recommended">YOU CHOOSE</span></div><label className="sr-only" htmlFor="mode-select">Processing mode</label><div className="mode-select-wrap"><Icon name={mode === 'cloud' ? 'cloud' : 'device'} size={19}/><select id="mode-select" value={mode} disabled={busy} onChange={event => setMode(event.target.value as InferenceModeChoice)}><option value="cloud">Cloud — start here</option><option value="hybrid">Prefer device, allow cloud fallback</option><option value="local">Device only — stay offline</option></select></div><p className="mode-description">{mode === 'cloud' ? 'Works on lighter laptops. Notes are sent to Firebase when you organize them.' : mode === 'hybrid' ? 'Uses the local model when ready; otherwise sends the note to Firebase’s cloud model. May start a model download.' : 'Uses a prepared local model on a compatible device. It will never fall back to cloud.'}</p><div className="device-check"><span><i className={localStatus === 'available' ? 'ready-dot' : ''}/>{LOCAL_LABELS[localStatus]}</span><button type="button" disabled={checking || busy} onClick={checkDevice}>{checking ? 'Checking…' : 'Check device'}</button></div></div>
          <div className="editor-actions">{busy ? <button className="primary-button stop-button" onClick={stop}><span className="spinner"/> Stop waiting</button> : <button className="primary-button organize-button" onClick={run}>Organize my notes <Icon name="arrow" size={19}/></button>}<button className="clear-button" disabled={busy || !note} onClick={() => { setNote(''); setResult(null); setError(''); }}>Clear</button></div>
          <div className="live-status" aria-live="polite">{busy ? progress : !settings ? 'Connect Firebase to generate. The example is available now.' : 'Firebase configured. Generate a note to verify the connection.'}</div>
          {error && <div className="error-message" role="alert"><Icon name="alert" size={17}/><span>{error}</span></div>}
          {!online && <div className="info-message"><Icon name="wifi" size={17}/><span>You're offline. Keep editing; your draft stays in this browser.</span></div>}
        </section>
        <section className="results-panel" aria-labelledby="results-heading">
          <div className="panel-heading"><div><span className="step-number">02</span><h2 id="results-heading">A little more clarity</h2></div>{result && <div className="result-tools"><button className="icon-button" onClick={copy} aria-label={copied ? 'Copied results' : 'Copy results'} title="Copy results"><Icon name={copied ? 'check' : 'copy'} size={17}/></button><button className="icon-button" onClick={download} aria-label="Download results" title="Download results"><Icon name="download" size={17}/></button></div>}</div>
          <div className="results-summary">{result ? <><span className={`source-badge source-${result.source}`}><Icon name={result.source === 'cloud' ? 'cloud' : result.source === 'device' ? 'device' : 'spark'} size={13}/>{result.source === 'sample' ? 'Sample preview · no AI request' : result.source === 'device' ? 'Processed on device' : 'Processed in cloud'}</span>{result.source !== 'sample' && <span className="elapsed">{(result.elapsedMs / 1000).toFixed(1)}s</span>}</> : <span>Your organized notes will appear here.</span>}</div>
          {stale && <div className="stale-message">Your note has changed. Organize it again to update these sections.</div>}
          <div className={`result-cards ${busy ? 'is-loading' : ''}`} aria-busy={busy}>{sections.map(section => <article key={section.key} className={`result-card card-${section.key}`}><div className="card-header"><span className="card-icon"><Icon name={section.icon} size={18}/></span><div><h3>{section.title}</h3><p>{section.subtitle}</p></div><span className="count-badge">{result ? result[section.key].length : '—'}</span></div>{result ? result[section.key].length ? <ul>{result[section.key].map((item, index) => <li key={`${section.key}-${index}`}><span className="list-dot"/>{item}</li>)}</ul> : <p className="empty-section">Nothing stated in this note.</p> : <div className="empty-card"><p>{section.empty}</p><span className="skeleton-line"/><span className="skeleton-line short"/></div>}</article>)}</div>
          <div className="review-note"><Icon name="note" size={16}/><p>A starting point, not a final decision. Check names, deadlines and details before acting.</p></div>
        </section>
      </div>
      <footer className="page-footer"><span><Icon name="check" size={14}/> Drafts stay on this browser.</span><span>Built for the work between the plans.</span></footer>
      {cacheFailed && <p className="cache-warning">Offline page caching could not be enabled in this browser. Local draft saving is separate.</p>}
    </main>
    {settingsOpen && <Settings initial={settings} onClose={() => setSettingsOpen(false)} onSave={value => { setSettings(value); setSettingsOpen(false); setError(''); window.location.reload(); }}/>}</>;
}

export default App;
