export const typography = {
  display: 'Syne_700Bold',
  displayRegular: 'Syne_400Regular',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

export type TextVariant = 'display' | 'title' | 'section' | 'body' | 'caption' | 'label';

export const typeScale: Record<
  TextVariant,
  { fontSize: number; lineHeight: number; fontFamily: string }
> = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: typography.display },
  title: { fontSize: 22, lineHeight: 28, fontFamily: typography.display },
  section: { fontSize: 17, lineHeight: 22, fontFamily: typography.bodyBold },
  body: { fontSize: 16, lineHeight: 22, fontFamily: typography.body },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: typography.body },
  label: { fontSize: 12, lineHeight: 16, fontFamily: typography.bodyMedium },
};
