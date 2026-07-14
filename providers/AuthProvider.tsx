import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { createSessionFromUrl } from '@/src/features/auth/oauth';
import type { Profile } from '@/src/features/auth/types';
import {
  upsertProfile,
  type ProfileUpdate,
} from '@/src/features/onboarding/profileApi';
import { registerPush } from '@/src/features/push/registerPush';

type AuthContextValue = {
  ready: boolean;
  /** False while fetching profile for an authenticated user. */
  profileReady: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isConfigured: boolean;
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<Profile>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load profile', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as Profile;
  return {
    ...row,
    liked_genre_ids: Array.isArray(row.liked_genre_ids) ? row.liked_genre_ids : [],
    disliked_genre_ids: Array.isArray(row.disliked_genre_ids) ? row.disliked_genre_ids : [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [profileReady, setProfileReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id || !isSupabaseConfigured) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    setProfileReady(false);
    const next = await fetchProfile(session.user.id);
    setProfile(next);
    setProfileReady(true);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      setProfileReady(true);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      setProfileReady(true);
      return;
    }

    if (!session?.user?.id) {
      setProfile(null);
      setProfileReady(true);
      return;
    }

    let cancelled = false;
    setProfileReady(false);
    void fetchProfile(session.user.id).then((next) => {
      if (cancelled) return;
      setProfile(next);
      setProfileReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id) {
      return;
    }

    void registerPush(session.user.id).catch((err) => {
      console.warn('Push registration failed', err);
    });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const handleUrl = (url: string) => {
      if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code=')) {
        void createSessionFromUrl(url).catch((err) => {
          console.warn('OAuth callback failed', err);
        });
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => sub.remove();
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      const next = await upsertProfile(session.user.id, patch);
      setProfile(next);
      return next;
    },
    [session?.user?.id],
  );

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { signInWithOAuthProvider } = await import('@/src/features/auth/oauth');
    await signInWithOAuthProvider('google');
  }, []);

  const signInWithApple = useCallback(async () => {
    const { signInWithOAuthProvider } = await import('@/src/features/auth/oauth');
    await signInWithOAuthProvider('apple');
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { wipeLocalSyncData } = await import('@/providers/InteractionsProvider');
      await wipeLocalSyncData();
    } catch (err) {
      console.warn('Failed to wipe local sync data', err);
    }

    if (!isSupabaseConfigured) {
      setSession(null);
      setProfile(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const needsOnboarding =
    isSupabaseConfigured && Boolean(session) && profileReady && !profile?.onboarding_completed;

  const value = useMemo(
    () => ({
      ready,
      profileReady,
      session,
      user: session?.user ?? null,
      profile,
      isConfigured: isSupabaseConfigured,
      needsOnboarding,
      refreshProfile,
      updateProfile,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [
      ready,
      profileReady,
      session,
      profile,
      needsOnboarding,
      refreshProfile,
      updateProfile,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithApple,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
