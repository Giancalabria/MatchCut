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
  /** Modal / sheet backdrop */
  scrim: string;
  /** Stamp overlays on swipe cards */
  stampLike: string;
  stampNope: string;
  stampSeen: string;
  /** Gradient stop over posters */
  posterScrim: string;
  /** Text/icons on dark poster media */
  onPoster: string;
  onPosterMuted: string;
  /** Native shadow / cinematic black cut */
  shadow: string;
  cutWipe: string;
};

/** A1 Hot amber — Tungsten vivid */
export const lightColors: ColorTokens = {
  bg: '#F0E8DC',
  bgGlow: '#FFE7B8',
  surface: '#FFFCF7',
  ink: '#1A1208',
  inkMuted: '#6A5A48',
  accent: '#E8940A',
  accentDeep: '#C97800',
  cta: '#C97800',
  onAccent: '#FFFFFF',
  accentSoft: '#FFE2A8',
  dangerSoft: '#F8D9D6',
  warningSoft: '#FFE8B8',
  nope: '#E4574C',
  seen: '#FFB300',
  match: '#FF4B78',
  line: '#D2C0A4',
  scrim: 'rgba(0,0,0,0.55)',
  stampLike: 'rgba(232, 148, 10, 0.88)',
  stampNope: 'rgba(228, 87, 76, 0.88)',
  stampSeen: 'rgba(255, 179, 0, 0.9)',
  posterScrim: 'rgba(0,0,0,0.82)',
  onPoster: '#FFFFFF',
  onPosterMuted: 'rgba(255,255,255,0.78)',
  shadow: '#000000',
  cutWipe: '#000000',
};

export const darkColors: ColorTokens = {
  bg: '#0A0806',
  bgGlow: '#2A1808',
  surface: '#1C140E',
  ink: '#FFF6EB',
  inkMuted: '#B7A793',
  accent: '#FFB020',
  accentDeep: '#FFC933',
  cta: '#E8940A',
  onAccent: '#1A0E00',
  accentSoft: '#3A240A',
  dangerSoft: '#3A1F1C',
  warningSoft: '#3A2A10',
  nope: '#E4574C',
  seen: '#FFB300',
  match: '#FF4B78',
  line: '#4A3A2A',
  scrim: 'rgba(0,0,0,0.55)',
  stampLike: 'rgba(255, 176, 32, 0.88)',
  stampNope: 'rgba(228, 87, 76, 0.88)',
  stampSeen: 'rgba(255, 179, 0, 0.9)',
  posterScrim: 'rgba(0,0,0,0.82)',
  onPoster: '#FFFFFF',
  onPosterMuted: 'rgba(255,255,255,0.78)',
  shadow: '#000000',
  cutWipe: '#000000',
};

export type ThemeMode = 'light' | 'dark' | 'system';
