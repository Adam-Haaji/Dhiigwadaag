import { StyleSheet } from 'react-native';
import { moderateScale, responsiveFont, layout } from '../constants/theme';

export const colors = {
  primary: '#E74C3C',      // Red for blood donation theme
  secondary: '#3498DB',    // Blue for secondary actions
  accent: '#F39C12',       // Orange for highlights
  background: '#F8F8FF',   // Light off-white background
  backgroundAlt: '#FFFFFF', // White for cards
  text: '#333333',         // Dark gray text
  textSecondary: '#666666', // Medium gray text
  grey: '#CCCCCC',         // Light grey
  card: '#FFFFFF',         // White card background
  highlight: '#FFC0CB',    // Light pink highlight
  success: '#27AE60',      // Green for success states
  warning: '#F39C12',      // Orange for warnings
  error: '#E74C3C',        // Red for errors
  border: '#E0E0E0',       // Light border color
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
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
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
