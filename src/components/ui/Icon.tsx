/* همه آیکون‌ها در یک کامپوننت ساده و سبک (بدون کتابخانه آیکون).
   برای سبک‌ماندن باندل، همه به‌صورت <path> درون‌خطی هستند. */

import type { ReactNode, SVGProps } from 'react';

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="2" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
      <path d="M16.4 5.4a3.2 3.2 0 0 1 0 5.9" />
      <path d="M17.6 14.6A6.5 6.5 0 0 1 22 20.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  'user-cog': (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20.5a6.3 6.3 0 0 1 9.4-5.5" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M18 13.6v1.4M18 20.6v1.4M13.9 15.8l1.2.7M20.9 19.5l1.2.7M13.9 20.2l1.2-.7M20.9 16.5l1.2-.7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 2.8v5.7c0 4.4-3.1 7.7-7.5 9.2-4.4-1.5-7.5-4.8-7.5-9.2V5.8z" />
      <path d="M9.2 12.2l2 2 3.6-3.8" />
    </>
  ),
  file: (
    <>
      <path d="M6.5 3h7l5 5v13h-12z" />
      <path d="M13.5 3v5h5" />
    </>
  ),
  'file-text': (
    <>
      <path d="M6.5 3h7l5 5v13h-12z" />
      <path d="M13.5 3v5h5" />
      <path d="M9.5 13h6M9.5 17h4" />
    </>
  ),
  template: (
    <>
      <path d="M12 3l8.5 4.6L12 12.2 3.5 7.6z" />
      <path d="M3.5 12.4L12 17l8.5-4.6" />
      <path d="M3.5 16.9L12 21.5l8.5-4.6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2.5" />
      <path d="M9 3.2h6v3H9z" />
      <path d="M9 11.5h6M9 15.5h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20.5 20.5L16 16" />
    </>
  ),
  filter: <path d="M3.5 5.5h17M6.5 12h11M10 18.5h4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l5 5L20 6.5" />,
  'chevron-down': <path d="M6 9.5l6 6 6-6" />,
  'chevron-up': <path d="M6 14.5l6-6 6 6" />,
  'chevron-left': <path d="M15 5.5l-6.5 6.5 6.5 6.5" />,
  'chevron-right': <path d="M9 5.5L15.5 12 9 18.5" />,
  'chevrons-left': <path d="M11 6l-6 6 6 6M19 6l-6 6 6 6" />,
  'chevrons-right': <path d="M13 6l6 6-6 6M5 6l6 6-6 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6" />
    </>
  ),
  moon: <path d="M20.5 15A8.5 8.5 0 1 1 9.2 3.8a7 7 0 0 0 11.3 11.2z" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2.5" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" />
      <path d="M10 16.5L5.5 12 10 7.5" />
      <path d="M5.5 12H15" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9.5a6 6 0 1 0-12 0c0 4.6-2 5.5-2 5.5h16s-2-0.9-2-5.5" />
      <path d="M10.2 18.7a2 2 0 0 0 3.6 0" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  upload: (
    <>
      <path d="M12 16.5V4.5M7.5 9L12 4.5 16.5 9" />
      <path d="M4.5 20.5h15" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5v12M7.5 11.5l4.5 5 4.5-5" />
      <path d="M4.5 20.5h15" />
    </>
  ),
  print: (
    <>
      <path d="M7 8.5V3.5h10v5" />
      <rect x="4" y="8.5" width="16" height="7.5" rx="2" />
      <path d="M8 16h8v4.5H8z" />
    </>
  ),
  edit: (
    <>
      <path d="M12.5 20.5h8" />
      <path d="M16.6 4.3a2.1 2.1 0 0 1 3 3L7.4 19.5l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.9 13.5h9.2L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10.5h17" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  phone: (
    <path d="M6.4 3.5h3l1.5 4-2 1.4a12.5 12.5 0 0 0 5.7 5.7l1.4-2 4 1.5v3a2.2 2.2 0 0 1-2.4 2.2A17.6 17.6 0 0 1 4.2 5.9 2.2 2.2 0 0 1 6.4 3.5z" />
  ),
  pin: (
    <>
      <path d="M12 21.5s7-6.6 7-11.5a7 7 0 1 0-14 0c0 4.9 7 11.5 7 11.5z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.5L12 4h8.5v8.5L12 21z" />
      <circle cx="16.5" cy="7.5" r="1.4" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 20.5V4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v16" />
      <path d="M15.5 9.5h3a1.5 1.5 0 0 1 1.5 1.5v9.5" />
      <path d="M8.5 7.5h2M8.5 11.5h2M8.5 15.5h2M3 20.5h18" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20.5h17" />
      <path d="M7.5 20.5v-6M12 20.5V6M16.5 20.5v-9" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6" />
      <path d="M3 5v4.5h4.5" />
      <path d="M12 8.2V12l3 1.8" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8.5v-3a2 2 0 0 1 2-2h2.5M15.5 3.5H18a2 2 0 0 1 2 2v3" />
      <path d="M20 15.5v3a2 2 0 0 1-2 2h-2.5M8.5 20.5H6a2 2 0 0 1-2-2v-3" />
      <path d="M4 12h16" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.7-6.2" />
      <path d="M20.5 4.2v5h-5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5l9.5 16.5H2.5z" />
      <path d="M12 9.5v4.5M12 17.2h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.7" />
      <path d="M12 11v5.2M12 7.9h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.2a4 4 0 0 1 8 0V10" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4" />
      <path d="M11 12.5l8-8M16.5 3.5l3.5 3.5M14 6l3 3" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2.5" />
      <path d="M15 6.5v-1A2 2 0 0 0 13 3.5H6a2 2 0 0 0-2 2V13a2 2 0 0 0 2 2h1" />
    </>
  ),
  save: (
    <>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h8.5l4.5 4.5v8.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
      <path d="M9 4.5v5h5.5v-5" />
      <path d="M8 20.5v-5h8v5" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="2.8" />
      <path d="M4 6v12c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8V6" />
      <path d="M4 12c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3.5l1.6 4.2 4.2 1.6-4.2 1.6L11 15.1 9.4 10.9 5.2 9.3l4.2-1.6z" />
      <path d="M18 15l.9 2.2 2.1.8-2.1.8L18 21l-.9-2.2-2.1-.8 2.1-.8z" />
    </>
  ),
  dots: (
    <>
      <circle cx="12" cy="5.5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="18.5" r="1.4" />
    </>
  ),
  arrowLeft: <path d="M19.5 12h-15M11 5.5L4.5 12l6.5 6.5" />,
  arrowRight: <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />,
  percent: (
    <>
      <path d="M19 5L5 19" />
      <circle cx="7.5" cy="7.5" r="2.4" />
      <circle cx="16.5" cy="16.5" r="2.4" />
    </>
  ),
  percentCircle: (
    <>
      <circle cx="12" cy="12" r="8.7" />
      <path d="M15.5 8.5l-7 7" />
      <circle cx="9.7" cy="9.7" r="1.2" />
      <circle cx="14.3" cy="14.3" r="1.2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5h4l1.5 2.5h6l1.5-2.5h4" />
      <path d="M5.5 4.5h13l2 9v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-5z" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.6 6.7" />
      <path d="M14 10a4 4 0 0 0-5.7 0L5.5 12.8a4 4 0 1 0 5.7 5.7l1.2-1.2" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  list: <path d="M4 6.5h16M4 12h16M4 17.5h10" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** خط ضخیم‌تر برای آیکون‌های پررنگ */
  bold?: boolean;
}

export function Icon({ name, size = 18, bold, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={bold ? 2.1 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
