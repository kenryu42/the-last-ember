import type { ReactNode } from "react";
export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    flame: <path d="M12 2c2 6 7 7 7 13a7 7 0 0 1-14 0c0-3 2-5 4-7-1 5 2 5 2 2 0-3 1-5 1-8Z" />,
    battle: (
      <>
        <path d="m5 3 14 14M3 3l1 5 4-4-5-1Zm12 14 3-3m-3 6 5-5M4 20l5-5M16 3l5 1-1 5-5 5" />
      </>
    ),
    elite: (
      <>
        <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />
      </>
    ),
    boss: (
      <>
        <path d="m3 7 4 4 5-7 5 7 4-4-2 13H5Z" />
        <path d="M8 16h8" />
      </>
    ),
    camp: (
      <>
        <path d="m3 20 9-16 9 16H3Zm5 0 4-8 4 8M9 2l3 2 3-2" />
      </>
    ),
    event: (
      <>
        <path d="M6 7a6 6 0 1 1 9 5c-3 2-3 2-3 5" />
        <path d="M12 21h.01" />
      </>
    ),
    shop: (
      <>
        <path d="M4 9h16l-2-6H6L4 9Zm1 0v12h14V9M9 21v-7h6v7" />
      </>
    ),
    shield: <path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z" />,
    heart: <path d="M12 21 3 12C-2 5 7-1 12 6 17-1 26 5 21 12Z" />,
    deck: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M2 6v13m20-13v13M9 9l3-3 3 3-3 3-3-3Z" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m12 6 4 6-4 6-4-6Z" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    arrow: <path d="M3 12h18m-6-6 6 6-6 6" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.flame}
    </svg>
  );
}
