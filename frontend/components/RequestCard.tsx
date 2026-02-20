import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { semanticColors, radii, spacing, elevation, typography } from '../constants/colors';
import { moderateScale, responsiveFont } from '../constants/theme';
import { fontFamilies } from '../constants/fonts';

interface RequestCardProps {
  request: {
    bloodType: string;
    note?: string;
    urgency?: 'low' | 'medium' | 'high';
    hospital?: string;
    createdAt?: string;
  };
}

const urgencyColorMap = {
  low: semanticColors.textSecondary,
  medium: semanticColors.interactivePrimary,
  high: semanticColors.interactiveDanger,
};

export default function RequestCard({ request }: RequestCardProps) {
  const urgencyColor = urgencyColorMap[request.urgency || 'medium'];
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.bloodType}>{request.bloodType}</Text>
        <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
      </View>
      {request.note && <Text style={styles.note}>{request.note}</Text>}
      <Text style={styles.meta}>{request.hospital || 'Hospital TBD'} • {request.createdAt || 'Just now'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors.bgSurface,
    borderRadius: radii.md,
    padding: moderateScale(spacing.md),
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
  bloodType: {
    fontFamily: fontFamilies.semibold,
    fontSize: responsiveFont(typography.h3.fontSize),
    color: semanticColors.textPrimary,
  },
  urgencyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  note: {
    fontFamily: fontFamilies.regular,
    fontSize: responsiveFont(13),
    color: semanticColors.textSecondary,
    marginBottom: moderateScale(spacing.xs),
    lineHeight: responsiveFont(18),
  },
  meta: {
    fontFamily: fontFamilies.medium,
    fontSize: responsiveFont(11),
    color: semanticColors.textMuted,
  },
});
