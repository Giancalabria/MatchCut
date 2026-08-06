import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/ui/AppText';
import { IconButton } from '@/src/ui/IconButton';
import { layout, space } from '@/theme/spacing';

export function ScreenHeader({
  title,
  onBack,
  right,
  showSafeTop = false,
}: {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  showSafeTop?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.row,
        showSafeTop ? { paddingTop: Math.max(insets.top, layout.safeTopMin) } : null,
      ]}
    >
      {onBack ? (
        <IconButton name="back" onPress={onBack} accessibilityLabel="Back" style={styles.backButton} />
      ) : (
        <View style={styles.spacer} />
      )}
      {title ? (
        <AppText variant="title" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
      ) : (
        <View style={styles.flex} />
      )}
      <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    minHeight: 44,
  },
  title: {
    flex: 1,
  },
  flex: { flex: 1 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  spacer: { width: 44, height: 44 },
  backButton: { width: 44, height: 44 },
});
