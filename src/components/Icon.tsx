import type { ReactNode } from 'react';

export type IconName = 'overview' | 'image' | 'chart' | 'pin' | 'settings' | 'cloud' | 'check' | 'close' | 'chevron' | 'download' | 'search' | 'info' | 'clock' | 'upload' | 'menu' | 'device' | 'layers' | 'refresh' | 'external' | 'filter' | 'flask';
export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>,
    chart: <><path d="M4 3v17h17M8 14l4-5 4 3 5-7"/></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    settings: <><path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="currentColor" strokeWidth="0"/><circle cx="16" cy="17" r="3" fill="currentColor" strokeWidth="0"/></>,
    cloud: <path d="M6 18h12a4 4 0 0 0 .5-8A6.5 6.5 0 0 0 6 8a5 5 0 0 0 0 10Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    chevron: <path d="m8 10 4 4 4-4"/>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    upload: <><path d="M12 16V3m-4 4 4-4 4 4M4 16v5h16v-5"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    device: <><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8M12 16v5"/></>,
    layers: <><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M18 18A8 8 0 0 1 5 15"/></>,
    external: <><path d="M14 3h7v7M21 3l-9 9M10 3H3v18h18v-7"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></>,
    flask: <><path d="M9 3h6M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
