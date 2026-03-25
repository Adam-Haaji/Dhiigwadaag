import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colorsBase, { elevation, radii, semanticColors, spacing, typography } from '@/constants/colors';
import type { CenterToastPayload, CenterToastType } from './types';

type Props = {
  toast: CenterToastPayload;
  opacity: Animated.AnimatedInterpolation<number> | Animated.Value;
  scale: Animated.AnimatedInterpolation<number> | Animated.Value;
  onClose: () => void;
};

function getKindMeta(kind: CenterToastType) {
  const p = colorsBase.palette;
  switch (kind) {
    case 'success':
      return {
        accent: p.successDark,
        iconBg: p.successLight,
        icon: 'checkmark' as const,
      };
    case 'error':
      return {
        accent: p.dangerDark,
        iconBg: p.dangerLight,
        icon: 'close' as const,
      };
    case 'warning':
      return {
        accent: p.warningDark,
        iconBg: p.warningLight,
        icon: 'warning' as const,
      };
    case 'info':
    default:
      return {
        accent: p.infoDark,
        iconBg: p.infoLight,
        icon: 'information' as const,
      };
  }
}

export default function CenterToastView({ toast, opacity, scale, onClose }: Props) {
  const meta = getKindMeta(toast.type);
  return (
    <Animated.View
      style={[
        s.card,
        {
          opacity,
          transform: [{ scale }],
          backgroundColor: semanticColors.bgSurface,
          borderColor: semanticColors.borderSubtle,
        },
      ]}
      accessibilityRole="alert"
    >
      <View style={[s.iconCircle, { backgroundColor: meta.iconBg }]}>
        <Ionicons name={meta.icon} size={20} color={meta.accent} />
      </View>

      <View style={s.textWrap}>
        <Text style={[s.title, { color: semanticColors.textPrimary }]} numberOfLines={1}>
          {toast.title}
        </Text>
        {!!toast.message && (
          <Text style={[s.body, { color: semanticColors.textSecondary }]} numberOfLines={2}>
            {toast.message}
          </Text>
        )}
      </View>

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={10}
        style={({ pressed }) => [
          s.okBtn,
          {
            backgroundColor: pressed ? semanticColors.bgMuted : semanticColors.bgSurface,
            borderColor: semanticColors.borderSubtle,
          },
        ]}
      >
        <Text style={[s.okBtnText, { color: semanticColors.textPrimary }]}>OK</Text>
      </Pressable>

      <View pointerEvents="none" style={[s.accentBar, { backgroundColor: meta.accent }]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    width: '90%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...elevation.md,
  },
  accentBar: {
    position: 'absolute',
    left: 10,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 999,
    opacity: 0.9,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
  },
  body: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flexShrink: 1,
  },
  okBtn: {
    marginLeft: spacing.xs,
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
