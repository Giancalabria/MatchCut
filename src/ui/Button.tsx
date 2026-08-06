import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppText } from '@/src/ui/AppText';
import { radii } from '@/theme/radii';
import { space } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary'
      ? colors.cta
      : variant === 'danger'
        ? 'transparent'
        : variant === 'secondary'
          ? colors.surface
          : 'transparent';

  const borderColor =
    variant === 'primary'
      ? colors.cta
      : variant === 'danger'
        ? colors.nope
        : variant === 'ghost'
          ? 'transparent'
          : colors.line;

  const textColor =
    variant === 'primary'
      ? colors.onAccent
      : variant === 'danger'
        ? colors.nope
        : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText
          variant="body"
          color={textColor}
          style={{ fontFamily: typography.bodyBold, fontSize: 15, lineHeight: 20 }}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingVertical: space.sm + 1,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
