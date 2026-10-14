export const glyphs: Record<string, string> = {
  refresh: `M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M18 18A8 8 0 0 1 4 12`,
  download: `M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5`,
  calendar: `M5 5h14v16H5V5ZM5 10h14M8 2v6M16 2v6`,
  user: `M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-2a8 8 0 0 1 16 0v2`,
  edit: `M15 5l4 4M3 21l5-1L21 7a2 2 0 0 0-4-4L4 16l-1 5Z`,
  chart: `M3 3v18h18M7 16v-5M12 16V7M17 16v-9`,
  link: `M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2`,
  dashboard: `M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z`,
  logout: `M9 4H3v16h6M9 12h12m-4-4 4 4-4 4`,
  mail: `M3 5h18v14H3V5Zm0 0 9 7 9-7`,
  lock: `M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 4v3`,
  trash: `M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7`,
  close: `M6 6l12 12M18 6 6 18`,
  menu: `M4 6h16M4 12h16M4 18h16`,
  check: `M5 12l4 4L19 6`,
  arrow: `M4 12h16m-6-6 6 6-6 6`,
  back: `M20 12H4m6-6-6 6 6 6`,
  up: `M12 20V4m-6 6 6-6 6 6`,
  down: `M12 4v16m-6-6 6 6 6-6`,
  search: `M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M16 16l5 5`,
  bookmark: `M6 3h12v18l-6-4-6 4V3Z`,
  shield: `M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6l-8-3Z`,
  spark: `M12 2c1.5 6 4 8.5 10 10-6 1.5-8.5 4-10 10-1.5-6-4-8.5-10-10 6-1.5 8.5-4 10-10Z`,
  moon: `M20 14.3A8.5 8.5 0 0 1 9.7 4a8.5 8.5 0 1 0 10.3 10.3Z`,
  sun: `M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4`,
  book: `M12 5v16M12 5C8 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-2-10 1Z`,
  globe: `M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2c-5 5-5 15 0 20 5-5 5-15 0-20`,
  audio: `M3 9h4l5-5v16l-5-5H3V9Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14`,
  wand: `M4 20 17 7l3 3L7 23M13 2v4M20 1v3M21 6h3M5 7l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z`,
  fire: `M13 2c3 5-2 7 0 10 1-1 2-3 2-5 5 4 7 9 4 13-4 5-14 2-14-4 0-4 3-6 5-9 0 3 1 4 2 5 2-4 2-6 1-10Z`,
  wind: `M2 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M2 17h7a2.5 2.5 0 1 1-2.5 2.5`,
  unlock: `M7 10V7a5 5 0 0 1 9-3M5 10h14v11H5V10Zm7 4v3`,
  letters: `M2 20 7 4l5 16M4 14h6M16 4h3c4 0 4 8 0 8h-3V4Zm0 8h3c4 0 4 8 0 8h-3v-8Z`,
  shuffle: `M3 6h3c5 0 6 12 11 12h4m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4`,
  copy: `M8 8h13v13H8V8ZM16 4V2H2v14h2`,
  external: `M14 3h7v7M21 3 11 13M11 3H3v18h18v-8`,
};

const aliases: Record<string, string> = {
  profile: `user`,
  connection: `link`,
  collapse: `back`,
  expand: `arrow`,
  'log-out': `logout`,
  light: `sun`,
  sound: `audio`,
  world: `globe`,
  volume: `audio`,
  alphabet: `letters`,
  'arrow-up': `up`,
  'arrow-left': `back`,
  'arrow-down': `down`,
  'arrow-right': `arrow`,
  'chevron-left': `back`,
  'chevron-right': `arrow`,
  'external-link': `external`,
};

export const getGlyph = (name: string) => glyphs[aliases[name] ?? name] ?? glyphs.spark;

export type IconProps = {
  name: string;
  size?: number;
  color?: string;
  className?: string;
};
