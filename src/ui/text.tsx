import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography, useTheme, type ColorToken, type TypographyVariant } from './theme';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
}

/** Texto padrão do app: sempre use este em vez do Text do React Native. */
export function Text({ variant = 'body', color = 'text', style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <RNText {...props} style={[typography[variant], { color: colors[color] }, style]} />;
}
