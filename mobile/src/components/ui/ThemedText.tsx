import React from 'react';
import { Text, StyleSheet, TextStyle, TextProps } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';

interface ThemedTextProps extends TextProps {
  variant?: 'title' | 'subtitle' | 'body' | 'muted' | 'label';
  style?: TextStyle;
}

export function ThemedText({ variant = 'body', style, ...props }: ThemedTextProps) {
  const { colors } = useTheme();

  const color =
    variant === 'muted'
      ? colors.mutedForeground
      : variant === 'label'
        ? colors.slate500
        : colors.foreground;

  return (
    <Text
      {...props}
      style={[
        variant === 'title' && styles.title,
        variant === 'subtitle' && styles.subtitle,
        variant === 'body' && styles.body,
        variant === 'label' && styles.label,
        { color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '500' },
});
