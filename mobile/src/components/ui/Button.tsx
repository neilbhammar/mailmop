import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { radius, spacing } from '@/theme/colors';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled,
  loading,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();

  const bg =
    variant === 'default'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : variant === 'destructive'
          ? colors.destructive
          : 'transparent';

  const textColor =
    variant === 'default'
      ? colors.primaryForeground
      : variant === 'destructive'
        ? colors.destructiveForeground
        : variant === 'outline' || variant === 'ghost'
          ? colors.foreground
          : colors.secondaryForeground;

  const paddingVertical = size === 'sm' ? spacing.sm : size === 'lg' ? spacing.lg : spacing.md;
  const paddingHorizontal = size === 'sm' ? spacing.lg : size === 'lg' ? spacing.xxl : spacing.xl;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
