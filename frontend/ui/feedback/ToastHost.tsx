import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Toast, { type ToastConfigParams } from 'react-native-toast-message';
import colorsBase, { elevation, semanticColors, radii, spacing } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

function getKindStyles(kind: ToastKind) {
  const p = colorsBase.palette;
  switch (kind) {
    case 'success':
      return { border: p.successDark, icon: 'checkmark-circle' as const, iconColor: p.successDark };
    case 'error':
      return { border: p.dangerDark, icon: 'close-circle' as const, iconColor: p.dangerDark };
    case 'warning':
      return { border: p.warningDark, icon: 'warning' as const, iconColor: p.warningDark };
    case 'info':
    default:
      return { border: p.infoDark, icon: 'information-circle' as const, iconColor: p.infoDark };
  }
}

function ToastCard({ kind, text1, text2 }: { kind: ToastKind; text1?: string; text2?: string }) {
  const k = getKindStyles(kind);
  return (
    <View style={[s.card, { borderLeftColor: k.border, backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }]}
      accessibilityRole="alert"
    >
      <View style={s.iconWrap}>
        <Ionicons name={k.icon} size={20} color={k.iconColor} />
      </View>

      <View style={s.textWrap}>
        {!!text1 && (
          <Text style={[s.title, { color: semanticColors.textPrimary }]} numberOfLines={2}>
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text style={[s.body, { color: semanticColors.textSecondary }]} numberOfLines={4}>
            {text2}
          </Text>
        )}
      </View>

      <Pressable onPress={() => Toast.hide()} accessibilityRole="button" accessibilityLabel="Close notification" hitSlop={10}>
        <Ionicons name="close" size={18} color={semanticColors.textMuted} />
      </Pressable>
    </View>
  );
}

const toastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => <ToastCard kind="success" text1={text1} text2={text2} />,
  error: ({ text1, text2 }: ToastConfigParams<any>) => <ToastCard kind="error" text1={text1} text2={text2} />,
  warning: ({ text1, text2 }: ToastConfigParams<any>) => <ToastCard kind="warning" text1={text1} text2={text2} />,
  info: ({ text1, text2 }: ToastConfigParams<any>) => <ToastCard kind="info" text1={text1} text2={text2} />,
} as const;

export default function ToastHost() {
  return <Toast config={toastConfig} />;
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    maxWidth: 420,
    width: '92%',
    ...elevation.md,
  },
  iconWrap: {
    width: 26,
    paddingTop: 1,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  body: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
  },
});
