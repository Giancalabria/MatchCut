import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/ui/AppText';
import { layout, space } from '@/theme/spacing';

export function TabScreenHeader({
  title,
  right,
  style,
}: {
  title?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.row,
        { paddingTop: Math.max(insets.top, layout.safeTopMin) },
        style,
      ]}
    >
      {title ? (
        <AppText variant="display" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
      ) : (
        <View style={styles.flex} />
      )}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 44,
    paddingBottom: space.xs,
  },
  title: { flex: 1 },
  flex: { flex: 1 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
