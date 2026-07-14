export type ColorTokens = {
  bg: string;
  bgGlow: string;
  surface: string;
  ink: string;
  inkMuted: string;
  accent: string;
  /** Highlight / pressed accent — not for white text fills in dark */
  accentDeep: string;
  /** Primary CTA fill — AA with onAccent */
  cta: string;
  onAccent: string;
  accentSoft: string;
  dangerSoft: string;
  warningSoft: string;
  nope: string;
  seen: string;
  match: string;
  line: string;
};

export const lightColors: ColorTokens = {
  bg: '#D8E0E8',
  bgGlow: '#C5E8E0',
  surface: '#FFFFFF',
  ink: '#0E151B',
  inkMuted: '#4A5A68',
  accent: '#00A896',
  accentDeep: '#007F73',
  cta: '#007F73',
  onAccent: '#FFFFFF',
  accentSoft: '#D0EDE8',
  dangerSoft: '#F8D9D6',
  warningSoft: '#F8E8C4',
  nope: '#E4574C',
  seen: '#E8A317',
  match: '#FF4B78',
  line: '#9AABBA',
};

export const darkColors: ColorTokens = {
  bg: '#0B1117',
  bgGlow: '#0C2420',
  surface: '#15202B',
  ink: '#F0F4F8',
  inkMuted: '#9AA8B8',
  accent: '#00A896',
  accentDeep: '#2DD4BF',
  cta: '#008F82',
  onAccent: '#FFFFFF',
  accentSoft: '#143530',
  dangerSoft: '#3A1F1C',
  warningSoft: '#3A2E14',
  nope: '#E4574C',
  seen: '#E8A317',
  match: '#FF4B78',
  line: '#3A4A5C',
};

export type ThemeMode = 'light' | 'dark' | 'system';
