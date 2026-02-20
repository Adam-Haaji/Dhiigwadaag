import { StyleSheet } from 'react-native';
import { semanticColors, radii, spacing } from '@/constants/colors';

export const bannerStyles = StyleSheet.create({
  container: {
    backgroundColor: semanticColors.interactivePrimary,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});
