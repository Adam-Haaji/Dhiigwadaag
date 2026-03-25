import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { IconSymbol } from '@/components/IconSymbol';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';
import colorsBase, { elevation, radii, semanticColors, spacing, typography } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import HeaderBanner from '@/components/HeaderBanner';
import { setHomeModePreference, setNavigatorRole } from '@/service/homeMode';

export default function RoleSelect() {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState<'donor'|'requester'|null>(null);
  const isCompactMobile = width < 400;

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: semanticColors.bgAlt },
        scrollContent: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        scrollWithTab: { paddingBottom: 100 },
        headerHero: {
          backgroundColor: semanticColors.interactivePrimary,
          borderRadius: 18,
          padding: spacing.xl,
          marginBottom: spacing.xl,
        },
        headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        headerLeft: { flexDirection: 'row', alignItems: 'center' },
        headerIconWrap: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        headerTitle: { color: semanticColors.textInverse, ...typography.h2, fontWeight: '800' },
        headerSubtitle: {
          color: semanticColors.textInverse,
          opacity: 0.94,
          ...typography.bodySmall,
          fontWeight: '500',
          marginTop: 2,
        },
        heroImagesRow: { flexDirection: 'row', marginTop: spacing.md },
        heroCircle: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colorsBase.palette.info,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        heroCircleAlt: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colorsBase.palette.warning,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sectionTitle: {
          ...typography.h3,
          fontWeight: '800',
          color: semanticColors.textPrimary,
          marginBottom: spacing.lg,
        },
        cardGrid: {
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: spacing.md,
        },
        cardGridCompact: {
          flexDirection: 'column',
          gap: spacing.lg,
        },
        card: {
          flex: 1,
          backgroundColor: semanticColors.bgSurface,
          borderRadius: 18,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          borderWidth: 1,
          borderColor: semanticColors.borderSubtle,
          shadowColor: '#000',
          shadowOpacity: 0.025,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
        cardImage: {
          width: '100%',
          height: 92,
          borderRadius: 14,
          marginBottom: spacing.md,
        },
        cardIconWrap: {
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: colorsBase.palette.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        },
        cardTitle: { ...typography.h4, fontWeight: '800', color: semanticColors.textPrimary, marginBottom: 4 },
        cardText: { ...typography.bodySmall, color: semanticColors.textSecondary, marginBottom: spacing.md, minHeight: 18 },
        ctaBtn: {
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 46,
          marginTop: spacing.sm,
          borderRadius: 13,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        },
        donor: { backgroundColor: semanticColors.interactivePrimary },
        request: { backgroundColor: colorsBase.palette.info },
        ctaTxt: { color: semanticColors.textInverse, ...typography.label, fontWeight: '800', marginLeft: 8 },
      }),
    [isDark]
  );

  const doSwitch = async (newRole: 'donor'|'requester') => {
    if (loading) return;
    setLoading(newRole);
    try {
      if (newRole === 'donor') {
        await setHomeModePreference('donor');
        // Initial selection: go to donor registration; on success we set role="donor" and show DonorTabs only.
        router.replace({ pathname: '/donorRegistration', params: { fromRoleSelection: '1' } });
      } else {
        await setHomeModePreference('requester');
        const requesterData = await api.requesterRegister();
        const token = user?.token;
        await setNavigatorRole('requester');
        await setUser({
          token,
          user: {
            ...user?.user,
            role: 'requester',
            email: requesterData?.user?.email ?? user?.user?.email,
            phone: requesterData?.user?.phone ?? user?.user?.phone,
            name: requesterData?.user?.name ?? user?.user?.name,
          },
        });
        router.replace('/(requester)');
      }
    } catch (e) {
      console.error('Role selection error:', e);
      if (newRole === 'donor') router.replace({ pathname: '/donorRegistration', params: { fromRoleSelection: '1' } });
      else router.replace('/(requester)');
    } finally {
      setLoading(null);
    }
  };
  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={[s.scrollContent, Platform.OS !== 'ios' && s.scrollWithTab]} showsVerticalScrollIndicator={false}>
        <HeaderBanner style={{ marginBottom: spacing.xl }}>
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.headerIconWrap}>
                <IconSymbol name="drop.fill" size={20} color={semanticColors.textInverse} />
              </View>
              <View>
                <Text style={s.headerTitle}>Choose your path</Text>
                <Text style={s.headerSubtitle}>Donate blood or request help</Text>
              </View>
            </View>
          </View>
          <View style={s.heroImagesRow}>
            <View style={s.heroCircle}><IconSymbol name="heart.fill" size={28} color={semanticColors.textInverse} /></View>
            <View style={s.heroCircleAlt}><IconSymbol name="person.2.fill" size={28} color={semanticColors.textInverse} /></View>
          </View>
        </HeaderBanner>

        <Text style={s.sectionTitle}>Choose your role to begin</Text>
        <View style={[s.cardGrid, isCompactMobile && s.cardGridCompact]}>
          <View style={[s.card, isCompactMobile && { flex: undefined }]}>
            <Image source={require('../assets/image/onboarding1.png')} resizeMode="cover" style={s.cardImage} />
            <View style={s.cardIconWrap}><IconSymbol name="hand.thumbsup.fill" size={22} color={semanticColors.interactivePrimary} /></View>
            <Text style={s.cardTitle}>Become a Donor</Text>
            <Text style={s.cardText} numberOfLines={1}>Register and start helping.</Text>
            <TouchableOpacity style={[s.ctaBtn, s.donor]} onPress={() => doSwitch('donor')} disabled={!!loading}>
              {loading === 'donor' ? (
                <ActivityIndicator color={semanticColors.textInverse} />
              ) : (
                <IconSymbol name="arrow.right.circle.fill" size={18} color={semanticColors.textInverse} />
              )}
              <Text style={s.ctaTxt}>Start to Donor</Text>
            </TouchableOpacity>
          </View>

          <View style={[s.card, isCompactMobile && { flex: undefined }]}>
            <Image source={require('../assets/image/onboarding2.png')} resizeMode="cover" style={s.cardImage} />
            <View style={[s.cardIconWrap, { backgroundColor: colorsBase.palette.infoLight }]}>
              <IconSymbol name="bell.fill" size={22} color={colorsBase.palette.info} />
            </View>
            <Text style={s.cardTitle}>Become a Requester</Text>
            <Text style={s.cardText} numberOfLines={1}>Create and manage requests.</Text>
            <TouchableOpacity style={[s.ctaBtn, s.request]} onPress={() => doSwitch('requester')} disabled={!!loading}>
              {loading === 'requester' ? (
                <ActivityIndicator color={semanticColors.textInverse} />
              ) : (
                <IconSymbol name="arrow.right.circle.fill" size={18} color={semanticColors.textInverse} />
              )}
              <Text style={s.ctaTxt}>Start to Requester</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
