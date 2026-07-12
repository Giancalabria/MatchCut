export type ColorTokens = {
  bg: string;
  bgGlow: string;
  surface: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accentDeep: string;
  nope: string;
  seen: string;
  match: string;
  line: string;
};

export const lightColors: ColorTokens = {
  bg: '#E8EEF4',
  bgGlow: '#D5F0EB',
  surface: '#FFFFFF',
  ink: '#0E151B',
  inkMuted: '#5B6B79',
  accent: '#00A896',
  accentDeep: '#007F73',
  nope: '#E4574C',
  seen: '#E8A317',
  match: '#FF4B78',
  line: '#C9D4DE',
};

export const darkColors: ColorTokens = {
  bg: '#0E151B',
  bgGlow: '#0F2A26',
  surface: '#1A2330',
  ink: '#F0F4F8',
  inkMuted: '#8B9AAB',
  accent: '#00A896',
  accentDeep: '#2DD4BF',
  nope: '#E4574C',
  seen: '#E8A317',
  match: '#FF4B78',
  line: '#2A3544',
};

export type ThemeMode = 'light' | 'dark' | 'system';
