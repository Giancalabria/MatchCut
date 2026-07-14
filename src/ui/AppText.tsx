import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { typeScale, type TextVariant } from '@/theme/typography';

export function AppText({
  variant = 'body',
  color,
  muted = false,
  style,
  children,
  ...rest
}: {
  variant?: TextVariant;
  color?: string;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
} & Omit<TextProps, 'style' | 'children'>) {
  const colors = useThemeColors();
  const scale = typeScale[variant];

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: scale.fontFamily,
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          color: color ?? (muted ? colors.inkMuted : colors.ink),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
