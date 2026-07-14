import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppIcon } from '@/src/ui/AppIcon';
import type { AppIconName } from '@/src/ui/icons';

export function IconButton({
  name,
  onPress,
  active = false,
  accessibilityLabel,
  style,
}: {
  name: AppIconName;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={12}
      style={[
        styles.button,
        {
          borderColor: active ? colors.cta : colors.line,
          backgroundColor: colors.surface,
        },
        style,
      ]}
    >
      <AppIcon name={name} size={20} color={active ? colors.cta : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
