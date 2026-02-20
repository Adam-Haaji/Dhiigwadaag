import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { commonStyles } from '@/styles/commonStyles';
import { semanticColors, spacing, typography } from '@/constants/colors';

type AppInputProps = {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: ViewStyle | ViewStyle[];
} & TextInputProps;

export default function AppInput({
  label,
  helperText,
  errorText,
  containerStyle,
  inputStyle,
  ...props
}: AppInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle as any]}>
      {label ? (
        <Text style={[styles.label, { color: semanticColors.textPrimary }]}>{label}</Text>
      ) : null}
      <TextInput
        {...props}
        style={[
          commonStyles.input,
          { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary },
          focused && commonStyles.inputFocused,
          inputStyle as any,
        ]}
        placeholderTextColor={semanticColors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus && props.onFocus(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur && props.onBlur(e);
        }}
      />
      {helperText ? (
        <Text style={[styles.helper, { color: semanticColors.textSecondary }]}>{helperText}</Text>
      ) : null}
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs, fontWeight: '600' },
  helper: { ...typography.caption, marginTop: spacing.xs, fontWeight: '400' },
  error: { color: semanticColors.interactiveDanger, marginTop: spacing.xs, fontSize: 12 },
});
