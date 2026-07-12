export type NopePolicy = 'restore_only' | 'session' | 'cooldown';

export type Profile = {
  id: string;
  display_name: string | null;
  region: string | null;
  platforms: string[];
  nope_policy: NopePolicy;
  nope_cooldown_days: number | null;
  onboarding_completed: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
};
