import React, { useState } from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { semanticColors, radii, spacing } from '../constants/colors';
import { moderateScale, responsiveFont } from '../constants/theme';
import { fontFamilies } from '../constants/fonts';

interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  [key: string]: any;
}

export default function Input({ label, error, helperText, style, multiline = false, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          multiline ? { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.sm } : undefined,
          focused ? styles.inputFocused : undefined,
          error ? styles.inputError : undefined,
          style,
        ]}
        placeholderTextColor={semanticColors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        {...rest}
      />
      {(helperText || error) && (
        <Text style={[styles.helper, error ? styles.helperError : undefined]}>
          {error ? error : helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: moderateScale(spacing.md),
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: responsiveFont(13),
    color: semanticColors.textSecondary,
    marginBottom: moderateScale(spacing.xs),
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
    backgroundColor: semanticColors.bgSurface,
    paddingHorizontal: moderateScale(spacing.md),
    paddingVertical: moderateScale(spacing.sm),
    borderRadius: radii.md,
    fontFamily: fontFamilies.regular,
    fontSize: responsiveFont(15),
    color: semanticColors.textPrimary,
  },
  inputFocused: {
    borderColor: semanticColors.interactivePrimary,
    shadowColor: semanticColors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inputError: {
    borderColor: semanticColors.interactiveDanger,
  },
  helper: {
    marginTop: moderateScale(spacing.xs),
    fontSize: responsiveFont(12),
    color: semanticColors.textMuted,
    fontFamily: fontFamilies.regular,
  },
  helperError: {
    color: semanticColors.interactiveDanger,
    fontFamily: fontFamilies.medium,
  },
});
