// أيقونات SVG بسيطة — منقولة حرفيًا من النسخة الأصلية
export const Ico = ({ d, size = 18, fill = "none" }: { d: string; size?: number; fill?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

export const I = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  gavel: "M14 4l6 6M12 6l6 6M4 20h10M9 11l-4 4a2 2 0 003 3l4-4",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  users: "M16 19v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 8.5a3 3 0 100-6 3 3 0 000 6M21 19v-2a4 4 0 00-3-3.8",
  wallet: "M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h14a2 2 0 002-2v-6H8a2 2 0 010-4h13",
  file: "M14 3v5h5M15 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 005.5 19.7l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 14.4H3a2 2 0 110-4h.1A1.6 1.6 0 004.3 8.5l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009.6 4.6V4a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 01-3.4 0",
  chat: "M21 11.5a8.4 8.4 0 01-9 8.4 8.8 8.8 0 01-4-1L3 21l2.1-4.8A8.4 8.4 0 0121 11.5z",
  menu: "M4 7h16M4 12h16M4 17h16",
  plus: "M12 5v14M5 12h14",
  back: "M15 6l-6 6 6 6",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  phone: "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  shield: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9.5 12l2 2 3.5-3.5",
};

export const Scales = ({ size = 190 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M60 18v78M44 100h32M32 34h56M60 26a4 4 0 100-8 4 4 0 000 8" />
    <path d="M32 34L20 62h24zM88 34L76 62h24" />
    <path d="M20 62a12 12 0 0024 0M76 62a12 12 0 0024 0" />
  </svg>
);