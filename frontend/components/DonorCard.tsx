import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { semanticColors, radii, spacing, elevation, typography } from '../constants/colors';
import { moderateScale, responsiveFont } from '../constants/theme';
import { fontFamilies } from '../constants/fonts';

interface DonorCardProps {
  donor: {
    name: string;
    bloodType: string;
    location?: { lat?: number; lng?: number };
    lastDonationDate?: string;
    availabilityStatus?: string;
  };
}

export default function DonorCard({ donor }: DonorCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{donor.name}</Text>
        <View style={styles.badge}>          
          <Text style={styles.badgeText}>{donor.bloodType}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {donor.location?.lat},{donor.location?.lng} • {donor.availabilityStatus || 'Available'}
      </Text>
      {donor.lastDonationDate && (
        <Text style={styles.secondary}>Last donation: {donor.lastDonationDate}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors.bgSurface,
    borderRadius: radii.lg,
    padding: moderateScale(spacing.lg),
    marginBottom: moderateScale(spacing.sm),
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
    ...elevation.none,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  name: {
    fontFamily: fontFamilies.semibold,
    fontSize: responsiveFont(typography.h3.fontSize),
    color: semanticColors.textPrimary,
    letterSpacing: 0.2,
  },
  badge: {
    backgroundColor: semanticColors.interactivePrimary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  badgeText: {
    color: semanticColors.textInverse,
    fontFamily: fontFamilies.medium,
    fontSize: responsiveFont(13),
  },
  meta: {
    fontFamily: fontFamilies.medium,
    fontSize: responsiveFont(12),
    color: semanticColors.textSecondary,
    marginBottom: moderateScale(spacing.xs),
  },
  secondary: {
    fontFamily: fontFamilies.regular,
    fontSize: responsiveFont(12),
    color: semanticColors.textMuted,
  },
});
