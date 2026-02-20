import { Platform } from 'react-native';
import { semanticColors, radii, spacing, elevation } from '@/constants/colors';
import { moderateScale, responsiveFont } from '@/constants/theme';

export const ui = {
  spacing: {
    xxs: moderateScale(spacing.xxs),
    xs: moderateScale(spacing.xs),
    sm: moderateScale(spacing.sm),
    md: moderateScale(spacing.md),
    lg: moderateScale(spacing.lg),
    xl: moderateScale(spacing.xl),
    xxl: moderateScale(spacing.xxl),
  },
  radii: {
    input: radii.md,
    card: radii.lg,
    chip: radii.pill,
    button: radii.pill,
  },
  elevation: {
    none: elevation.none,
    card: elevation.sm,
    modal: elevation.md,
  },
  text: {
    title: {
      fontSize: responsiveFont(18),
      fontWeight: '700' as const,
      color: semanticColors.textPrimary,
    },
    section: {
      fontSize: responsiveFont(16),
      fontWeight: '700' as const,
      color: semanticColors.textPrimary,
    },
    body: {
      fontSize: responsiveFont(15),
      fontWeight: '400' as const,
      color: semanticColors.textPrimary,
    },
    meta: {
      fontSize: responsiveFont(12),
      fontWeight: '500' as const,
      color: semanticColors.textSecondary,
    },
  },
  card: {
    base: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      padding: moderateScale(spacing.lg),
      ...elevation.none,
    },
    elevated: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: radii.lg,
      padding: moderateScale(spacing.lg),
      ...elevation.sm,
    },
  },
  tabBar: {
    container: {
      backgroundColor: semanticColors.bgSurface,
      borderTopWidth: 1,
      borderTopColor: semanticColors.borderSubtle,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: -2 },
          }
        : null),
    },
  },
} as const;
