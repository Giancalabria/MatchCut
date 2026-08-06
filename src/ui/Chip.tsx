import { Pressable, StyleSheet } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppText } from '@/src/ui/AppText';
import { radii } from '@/theme/radii';
import { space } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.cta : colors.line,
        },
      ]}
    >
      <AppText
        variant="body"
        color={colors.ink}
        style={{
          fontFamily: selected ? typography.bodyBold : typography.body,
          fontSize: 15,
          lineHeight: 20,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.sm + 2,
  },
});
