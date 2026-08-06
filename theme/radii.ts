/** Border radii — avoid full (999) except avatars and thin progress bars. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  /** Deck cards — oversized media surface */
  deck: 28,
  /** Circle — avatars / progress tracks */
  full: 999,
} as const;
