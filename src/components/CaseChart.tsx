import { useId, useState } from 'react';
import { shortDate } from '../lib/dashboard.ts';

export default function CaseChart({ series, compact = false }: { series: { week: string; cases: number }[]; compact?: boolean }) {
  const gradient = useId().replaceAll(':', '');
  const [active, setActive] = useState<number | null>(null);
  const width = 800, height = compact ? 190 : 250;
  const left = 42, right = 22, top = 24, bottom = 35;
  const max = Math.max(5, Math.ceil(Math.max(...series.map(p => p.cases)) / 5) * 5);
  const x = (i: number) => left + i / Math.max(1, series.length - 1) * (width - left - right);
  const y = (n: number) => top + (1 - n / max) * (height - top - bottom);
  const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.cases)}`).join(' ');
  const shown = active !== null && series[active] ? active : series.length - 1;
  const point = series[shown];
  return <div className="case-chart">
    <div className="chart-readout"><span className="legend-swatch"/>Reported cases<span className="chart-point-value">{point.cases}</span><span className="muted">Week of {shortDate(point.week)}</span></div>
    <svg role="img" aria-label={`Synthetic weekly case counts: ${series.map(p => `${shortDate(p.week)}: ${p.cases}`).join('; ')}. No forecast.`} viewBox={`0 0 ${width} ${height}`} onPointerLeave={() => setActive(null)}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#148478" stopOpacity=".13"/><stop offset="100%" stopColor="#148478" stopOpacity=".01"/></linearGradient></defs>
      {[0,1,2,3,4].map(i => <g key={i}><line x1={left} x2={width-right} y1={y(max*i/4)} y2={y(max*i/4)} stroke="#e8edf1" strokeDasharray={i ? '3 4' : undefined}/><text x={left-12} y={y(max*i/4)+4} textAnchor="end">{Number((max*i/4).toFixed(1))}</text></g>)}
      <path d={`${line} L${x(series.length-1)},${y(0)} L${left},${y(0)} Z`} fill={`url(#${gradient})`}/>
      <path d={line} fill="none" stroke="#148478" strokeWidth="2.7" strokeLinejoin="round"/>
      {series.map((p, i) => <g key={p.week} onPointerEnter={() => setActive(i)} onClick={() => setActive(i)}>
        <rect x={x(i)-(width-left-right)/series.length/2} y={top} width={(width-left-right)/series.length} height={height-top-bottom} fill="transparent"/>
        {(i === shown || i === series.length-1) && <circle cx={x(i)} cy={y(p.cases)} r={i === shown ? 4.5 : 3} fill="#148478" stroke="white" strokeWidth="2"/>}
        {(i === 0 || i === series.length-1 || i % Math.ceil(series.length/4) === 0) && <text x={x(i)} y={height-9} textAnchor="middle">{shortDate(p.week)}</text>}
      </g>)}
      {active !== null && <line x1={x(shown)} x2={x(shown)} y1={top} y2={height-bottom} stroke="#90bdb7" strokeDasharray="3 4" pointerEvents="none"/>}
    </svg>
  </div>;
}
