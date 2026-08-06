import { StyleSheet, TextInput, type TextInputProps, type StyleProp, type TextStyle } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { radii } from '@/theme/radii';
import { space } from '@/theme/spacing';
import { typeScale, typography } from '@/theme/typography';

export function TextField({
  style,
  ...rest
}: TextInputProps & { style?: StyleProp<TextStyle> }) {
  const colors = useThemeColors();

  return (
    <TextInput
      placeholderTextColor={colors.inkMuted}
      {...rest}
      style={[
        styles.input,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          color: colors.ink,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    fontFamily: typography.body,
    fontSize: typeScale.body.fontSize,
    lineHeight: typeScale.body.lineHeight,
    minHeight: 48,
  },
});
