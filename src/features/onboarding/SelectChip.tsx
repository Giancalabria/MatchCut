import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { typography } from '@/theme/typography';

export function SelectChip({
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
          backgroundColor: selected ? colors.cta : colors.surface,
          borderColor: selected ? colors.cta : colors.line,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.onAccent : colors.ink,
          fontFamily: selected ? typography.bodyBold : typography.body,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
