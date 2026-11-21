export default function BeadSample({ count, seed, showGuides }: { count: number; seed: number; showGuides: boolean }) {
  const columns = 10;
  const beads = Array.from({ length: count }, (_, i) => {
    const jitterX = Math.sin((i + 1) * (seed + 3) * 4.13) * 8;
    const jitterY = Math.cos((i + 2) * (seed + 2) * 2.27) * 7;
    return { x: 68 + (i % columns) * 34 + jitterX, y: 69 + Math.floor(i / columns) * 32 + jitterY };
  });
  return <svg viewBox="0 0 460 330" className="bead-sample" role="img" aria-label={`Sample illustration containing ${count} beads, used as a larva proxy. This is not a photograph.`}>
    <defs><radialGradient id="water"><stop offset="0" stopColor="#e0eced"/><stop offset="1" stopColor="#c1d4d8"/></radialGradient><radialGradient id="bead"><stop offset="0" stopColor="#6c8595"/><stop offset=".65" stopColor="#3f5f72"/><stop offset="1" stopColor="#28495e"/></radialGradient></defs>
    <rect width="460" height="330" fill="#e3e9ec"/>
    <rect x="25" y="24" width="410" height="281" rx="22" fill="#c4d0d5" stroke="#b1c0c7"/>
    <rect x="35" y="34" width="390" height="261" rx="17" fill="url(#water)" stroke="#f1f6f8" strokeWidth="2"/>
    {beads.map((p, i) => <g key={i}><ellipse cx={p.x+2} cy={p.y+3} rx="7.5" ry="6.2" fill="#3f5f72" opacity=".15"/><circle cx={p.x} cy={p.y} r="6.2" fill="url(#bead)"/><circle cx={p.x-1.8} cy={p.y-2} r="1.4" fill="#c8d9e0" opacity=".6"/>{showGuides && <rect x={p.x-10} y={p.y-10} width="20" height="20" rx="3" fill="none" stroke="#159788" strokeWidth="1" opacity=".8"/>}</g>)}
    <path d="M47 53h18M47 53v18M413 53h-18M413 53v18M47 277h18M47 277v-18M413 277h-18M413 277v-18" fill="none" stroke="#69878e" strokeWidth="1.2" opacity=".5"/>
    <rect x="149" y="268" width="162" height="18" rx="3" fill="#e9f0f2" opacity=".9"/><text x="230" y="280" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="9" letterSpacing="1" fill="#57717c">BEAD PROXY · ILLUSTRATION</text>
  </svg>;
}
