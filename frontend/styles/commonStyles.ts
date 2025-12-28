import { StyleSheet } from 'react-native';
import { moderateScale, responsiveFont, layout } from '../constants/theme';
import colorsBase, { semanticColors, gradients } from '@/constants/colors';

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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
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
    fontSize: responsiveFont(28),
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    marginBottom: moderateScale(16),
  },
  subtitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
    marginBottom: moderateScale(12),
  },
  text: {
    fontSize: responsiveFont(16),
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: moderateScale(8),
    lineHeight: responsiveFont(24),
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
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    marginVertical: moderateScale(8),
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(12),
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(16),
    fontSize: responsiveFont(16),
    color: colors.text,
    marginVertical: moderateScale(8),
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: colors.primary,
  },
});
