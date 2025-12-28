import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors as themeColors } from '@/styles/commonStyles';
import { IconSymbol, IconSymbolName } from '@/components/IconSymbol';

type CTA = {
  icon: IconSymbolName;
  bg?: string;
  onPress?: () => void;
  label?: string;
};

export default function HeroCard({
  title,
  subtitle,
  ctas = [],
}: {
  title: string;
  subtitle?: string;
  ctas?: CTA[];
}) {
  return (
    <View style={s.wrapper}>
      <View style={s.dropBadge}>
        <IconSymbol name="drop.fill" size={18} color={themeColors.backgroundAlt} />
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {ctas?.length ? (
        <View style={s.ctaRow}>
          {ctas.map((c, i) => (
            <View key={String(i)} style={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={c.onPress}
                activeOpacity={0.85}
                style={[s.cta, { backgroundColor: c.bg || '#3498DB' }]}
              >
                <IconSymbol name={c.icon} size={26} color="#FFFFFF" />
              </TouchableOpacity>
              {!!c.label && <Text style={s.ctaLabel}>{c.label}</Text>}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    width: '92%',
    backgroundColor: themeColors.primary,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  dropBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  cta: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    opacity: 0.95,
  },
});
