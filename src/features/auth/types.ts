export type NopePolicy = 'restore_only' | 'session' | 'cooldown';

export type Profile = {
  id: string;
  display_name: string | null;
  region: string | null;
  platforms: string[];
  nope_policy: NopePolicy;
  nope_cooldown_days: number | null;
  onboarding_completed: boolean;
  liked_genre_ids: number[];
  disliked_genre_ids: number[];
  /** Weighted taste cache rebuilt by personalized-feed (optional / opaque). */
  taste_profile?: Record<string, unknown>;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
};
