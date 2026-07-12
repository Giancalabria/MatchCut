/** Curated TMDB watch-provider ids used in onboarding / filters. */
export type StreamingPlatform = {
  id: string;
  tmdbProviderId: number;
  nameKey: string;
};

export const STREAMING_PLATFORMS: StreamingPlatform[] = [
  { id: 'netflix', tmdbProviderId: 8, nameKey: 'platforms.netflix' },
  { id: 'prime', tmdbProviderId: 9, nameKey: 'platforms.prime' },
  { id: 'disney', tmdbProviderId: 337, nameKey: 'platforms.disney' },
  { id: 'max', tmdbProviderId: 1899, nameKey: 'platforms.max' },
  { id: 'apple', tmdbProviderId: 350, nameKey: 'platforms.apple' },
  { id: 'paramount', tmdbProviderId: 531, nameKey: 'platforms.paramount' },
  { id: 'hulu', tmdbProviderId: 15, nameKey: 'platforms.hulu' },
  { id: 'peacock', tmdbProviderId: 386, nameKey: 'platforms.peacock' },
  { id: 'crunchyroll', tmdbProviderId: 283, nameKey: 'platforms.crunchyroll' },
  { id: 'mubi', tmdbProviderId: 11, nameKey: 'platforms.mubi' },
];

export type RegionOption = {
  code: string;
  nameKey: string;
};

export const REGIONS: RegionOption[] = [
  { code: 'AR', nameKey: 'regions.AR' },
  { code: 'MX', nameKey: 'regions.MX' },
  { code: 'ES', nameKey: 'regions.ES' },
  { code: 'US', nameKey: 'regions.US' },
  { code: 'CO', nameKey: 'regions.CO' },
  { code: 'CL', nameKey: 'regions.CL' },
  { code: 'PE', nameKey: 'regions.PE' },
  { code: 'UY', nameKey: 'regions.UY' },
  { code: 'BR', nameKey: 'regions.BR' },
  { code: 'GB', nameKey: 'regions.GB' },
];

export const COOLDOWN_PRESETS = [7, 30, 90, 180] as const;

export const DEFAULT_NOPE_POLICY = 'cooldown' as const;
export const DEFAULT_NOPE_COOLDOWN_DAYS = 90;
