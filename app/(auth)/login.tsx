import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppText, Button, TextField } from '@/src/ui';
import { layout, space } from '@/theme/spacing';

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
          <AppText variant="hero" style={styles.brand}>
            {t('auth.title')}
          </AppText>
          <AppText variant="section" muted style={styles.subtitle}>
            {t('auth.subtitle')}
          </AppText>

          {!isConfigured ? (
            <>
              <AppText muted style={styles.hint}>
                {t('auth.supabaseMissing')}
              </AppText>
              <Button label={t('auth.enterApp')} onPress={() => router.replace('/(tabs)/explore')} />
            </>
          ) : (
            <>
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder={t('auth.email')}
                value={email}
                onChangeText={setEmail}
              />
              <TextField
                secureTextEntry
                placeholder={t('auth.password')}
                value={password}
                onChangeText={setPassword}
              />

              {error ? (
                <AppText color={colors.nope} variant="caption">
                  {error}
                </AppText>
              ) : null}

              <Button
                label={mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
                loading={busy}
                disabled={!email || password.length < 6}
                onPress={() =>
                  run(() =>
                    mode === 'signin'
                      ? signInWithEmail(email.trim(), password)
                      : signUpWithEmail(email.trim(), password),
                  )
                }
              />

              <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                <AppText
                  variant="caption"
                  color={colors.accentDeep}
                  style={styles.switchMode}
                >
                  {mode === 'signin' ? t('auth.needAccount') : t('auth.haveAccount')}
                </AppText>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: colors.line }]} />
                <AppText variant="caption" muted>
                  {t('auth.or')}
                </AppText>
                <View style={[styles.divider, { backgroundColor: colors.line }]} />
              </View>

              <Button
                variant="secondary"
                label={t('auth.continueGoogle')}
                disabled={busy}
                onPress={() => run(() => signInWithGoogle())}
              />
              <Button
                variant="secondary"
                label={t('auth.continueApple')}
                disabled={busy}
                onPress={() => run(() => signInWithApple())}
              />
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
    paddingHorizontal: layout.screenPaddingX,
    justifyContent: 'center',
    gap: space.sm,
  },
  brand: {
    letterSpacing: -0.5,
  },
  subtitle: {
    marginBottom: space.sm,
  },
  hint: {
    marginBottom: space.xs,
  },
  switchMode: {
    textAlign: 'center',
    marginTop: space.xxs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    marginVertical: space.xxs,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
