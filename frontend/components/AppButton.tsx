import React from 'react';
import { TouchableOpacity, Text, ViewStyle, StyleSheet } from 'react-native';
import { buttonStyles } from '@/styles/commonStyles';
import { semanticColors, spacing, typography } from '@/constants/colors';

type AppButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle | ViewStyle[];
};

export default function AppButton({ title, onPress, disabled, loading, variant = 'primary', style }: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const baseStyle = isPrimary ? buttonStyles.primaryButton : buttonStyles.secondaryButton;
  const textStyle = isPrimary ? buttonStyles.primaryButtonText : buttonStyles.secondaryButtonText;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[baseStyle, (disabled || loading) && styles.disabled, style as any]}
    >
      <Text style={textStyle}>{loading ? (isPrimary ? 'Please wait…' : title) : title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.6 },
});
