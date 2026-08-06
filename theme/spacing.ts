/** 4pt rhythm — prefer aliases over raw numbers in screens. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const layout = {
  /** Default horizontal padding for tabs, onboarding, settings */
  screenPaddingX: space.xl,
  /** Compact padding where the poster needs horizontal air (explore/deck) */
  screenPaddingXCompact: space.lg,
  sectionGap: space.md,
  stackGap: space.sm,
  inlineGap: space.xs,
  safeTopMin: space.xs,
} as const;
