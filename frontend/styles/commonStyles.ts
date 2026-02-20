import { StyleSheet } from 'react-native';
import { moderateScale, responsiveFont, layout } from '../constants/theme';
import colorsBase, { semanticColors, gradients, spacing, typography, elevation } from '@/constants/colors';

// Theme-aware shared colors for screens using common styles
export const colors = {
  primary: colorsBase.palette.brandBright,
  secondary: '#3498DB',
  accent: '#F39C12',
  background: semanticColors.bgAlt,
  backgroundAlt: semanticColors.bgSurface,
  text: semanticColors.textPrimary,
  textSecondary: semanticColors.textSecondary,
  grey: '#CCCCCC',
  card: semanticColors.bgSurface,
  highlight: '#FFC0CB',
  success: '#27AE60',
  warning: '#F39C12',
  error: colorsBase.palette.danger,
  border: semanticColors.borderSubtle,
};

export const buttonStyles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    ...elevation.none,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    ...elevation.none,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    ...typography.body,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.text,
    ...typography.body,
    fontWeight: '600',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
    paddingHorizontal: moderateScale(20),
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.h3,
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.md,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    width: '100%',
    ...elevation.none,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    marginVertical: spacing.sm,
    ...elevation.none,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: colors.primary,
  },
});
