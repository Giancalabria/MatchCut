import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { typography } from '@/theme/typography';

export default function LoginScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    isConfigured,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.unknownError');
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.bg, colors.bgGlow]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}
        >
          <Text style={[styles.brand, { color: colors.ink, fontFamily: typography.display }]}>
            {t('auth.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted, fontFamily: typography.body }]}>
            {t('auth.subtitle')}
          </Text>

          {!isConfigured ? (
            <>
              <Text style={[styles.hint, { color: colors.inkMuted, fontFamily: typography.body }]}>
                {t('auth.supabaseMissing')}
              </Text>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.cta }]}
                onPress={() => router.replace('/(tabs)/explore')}
              >
                <Text style={[styles.primaryLabel, { fontFamily: typography.bodyBold, color: colors.onAccent }]}>
                  {t('auth.enterApp')}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder={t('auth.email')}
                placeholderTextColor={colors.inkMuted}
                value={email}
                onChangeText={setEmail}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    color: colors.ink,
                    fontFamily: typography.body,
                  },
                ]}
              />
              <TextInput
                secureTextEntry
                placeholder={t('auth.password')}
                placeholderTextColor={colors.inkMuted}
                value={password}
                onChangeText={setPassword}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    color: colors.ink,
                    fontFamily: typography.body,
                  },
                ]}
              />

              {error ? (
                <Text style={[styles.error, { color: colors.nope, fontFamily: typography.body }]}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                disabled={busy || !email || password.length < 6}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.cta,
                    opacity: busy || !email || password.length < 6 ? 0.5 : 1,
                  },
                ]}
                onPress={() =>
                  run(() =>
                    mode === 'signin'
                      ? signInWithEmail(email.trim(), password)
                      : signUpWithEmail(email.trim(), password),
                  )
                }
              >
                {busy ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={[styles.primaryLabel, { fontFamily: typography.bodyBold, color: colors.onAccent }]}>
                    {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
                  </Text>
                )}
              </Pressable>

              <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                <Text
                  style={[styles.switchMode, { color: colors.accent, fontFamily: typography.bodyMedium }]}
                >
                  {mode === 'signin' ? t('auth.needAccount') : t('auth.haveAccount')}
                </Text>
              </Pressable>

              <View style={[styles.dividerRow]}>
                <View style={[styles.divider, { backgroundColor: colors.line }]} />
                <Text style={{ color: colors.inkMuted, fontFamily: typography.body, fontSize: 13 }}>
                  {t('auth.or')}
                </Text>
                <View style={[styles.divider, { backgroundColor: colors.line }]} />
              </View>

              <Pressable
                disabled={busy}
                style={[styles.secondaryButton, { borderColor: colors.line }]}
                onPress={() => run(() => signInWithGoogle())}
              >
                <Text
                  style={[styles.secondaryLabel, { color: colors.ink, fontFamily: typography.bodyMedium }]}
                >
                  {t('auth.continueGoogle')}
                </Text>
              </Pressable>

              <Pressable
                disabled={busy}
                style={[styles.secondaryButton, { borderColor: colors.line }]}
                onPress={() => run(() => signInWithApple())}
              >
                <Text
                  style={[styles.secondaryLabel, { color: colors.ink, fontFamily: typography.bodyMedium }]}
                >
                  {t('auth.continueApple')}
                </Text>
              </Pressable>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  form: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  brand: {
    fontSize: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { fontSize: 14 },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryLabel: {
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryLabel: {
    fontSize: 16,
  },
  switchMode: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
