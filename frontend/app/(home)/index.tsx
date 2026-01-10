import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router } from "expo-router";
import { ScrollView, StyleSheet, View, Text, Platform, TouchableOpacity, Animated, RefreshControl } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, commonStyles } from "@/styles/commonStyles";
import { api } from "@/service/api";
import { colors as theme, spacing as themeSpacing, radii as themeRadii, moderateScale, responsiveFont } from "@/constants/theme";
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';
// Connectivity diagnostics removed per request

// Lazy-load LinearGradient like in Notifications to keep consistent header rendering
let LinearGradient: any;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch { LinearGradient = View; }

export default function HomeIndex() {
  const { user } = require('@/hooks/useAuth').default();
  const role = String(user?.user?.role || '').toLowerCase();
  const { isDark, toggleDark } = useTheme();
  // Removed old diagnostics state & handler (visual-only upgrade).

  // Pulse animation for Emergency action
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Dashboard stats fetched from backend
  const [totals, setTotals] = useState({ donors: 0, requests: 0, saved: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const fetchStats = useCallback(async () => {
    try {
      const data = await api.statsSummary();
      const d = Number(data?.totalDonors) || 0;
      const r = Number(data?.totalRequests) || 0;
      const s = Number(data?.livesSaved) || 0;
      setTotals({ donors: d, requests: r, saved: s });
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  // Periodic refresh every 30s to keep stats up-to-date
  useEffect(() => {
    const id = setInterval(() => { fetchStats(); }, 30000);
    return () => clearInterval(id);
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchStats(); } finally { setRefreshing(false); }
  }, [fetchStats]);

  const bloodTips = [
    {
      title: "Stay Hydrated",
      description: "Drink plenty of water before and after donating blood.",
      icon: "drop.fill",
    },
    {
      title: "Eat Iron-Rich Foods",
      description: "Include spinach, red meat, and beans in your diet.",
      icon: "leaf.fill",
    },
    {
      title: "Get Enough Rest",
      description: "Ensure you have adequate sleep before donating.",
      icon: "moon.fill",
    },
  ];

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semanticColors.bgAlt,
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: themeSpacing.xl, paddingVertical: themeSpacing.lg },
    scrollContentWithTabBar: { paddingBottom: 100 },
    headerGradient: {
      paddingHorizontal: themeSpacing.xl,
      paddingTop: themeSpacing.lg,
      paddingBottom: themeSpacing.xl,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      marginBottom: themeSpacing.md,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconWrap: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    headerTitle: { fontSize: responsiveFont(22), fontWeight: '800', letterSpacing: 0.2, marginBottom: 2 },
    headerSubtitle: { fontSize: responsiveFont(13), fontWeight: '500' },
    headerToggle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(13,13,13,0.35)',
    },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: themeSpacing.lg },
    statCardNew: {
      flex: 1, backgroundColor: semanticColors.bgSurface, borderRadius: themeRadii.md, borderWidth: 1, borderColor: semanticColors.borderSubtle,
      paddingVertical: themeSpacing.md, paddingHorizontal: themeSpacing.md, alignItems: 'flex-start', marginHorizontal: 4,
    },
    statIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statValueNew: { fontSize: responsiveFont(22), fontWeight: '800', color: semanticColors.textPrimary, marginBottom: 2 },
    statLabelNew: { fontSize: responsiveFont(12), color: semanticColors.textSecondary },
    sectionCard: { backgroundColor: semanticColors.bgSurface, borderRadius: themeRadii.lg, borderWidth: 1, borderColor: semanticColors.borderSubtle, padding: themeSpacing.lg, marginBottom: themeSpacing.lg },
    sectionTitleNew: { fontSize: responsiveFont(16), fontWeight: '700', color: semanticColors.textPrimary, marginBottom: themeSpacing.md },
    actionsRow: { flexDirection: 'row', gap: themeSpacing.md, justifyContent: 'space-between' },
    actionBtn: { flex: 1, borderRadius: themeRadii.lg, overflow: 'hidden' },
    actionGradient: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: moderateScale(themeSpacing.lg), paddingHorizontal: moderateScale(themeSpacing.md), gap: moderateScale(8) },
    actionBtnPrimary: { backgroundColor: theme.primary, shadowColor: '#C62828', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
    actionBtnDanger: { backgroundColor: '#E53935', shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
    actionGradientEmergency: { backgroundColor: '#E53935' },
    actionIcon: { width: moderateScale(42), height: moderateScale(42), borderRadius: moderateScale(21), alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.18)' },
    actionIconDanger: { backgroundColor: 'rgba(255,255,255,0.18)' },
    actionLabel: { fontSize: responsiveFont(13), fontWeight: '600' },
    actionLabelPrimary: { letterSpacing: 0.3 },
    actionLabelDanger: { letterSpacing: 0.3 },
    tipCard: {
      backgroundColor: semanticColors.bgSurface, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
      ...(Platform.select({ web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)' } }) as any),
    },
    tipIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    tipContent: { flex: 1 },
    tipTitle: { fontSize: responsiveFont(16), fontWeight: '600', color: semanticColors.textPrimary, marginBottom: 4 },
    tipDescription: { fontSize: responsiveFont(14), color: semanticColors.textSecondary, lineHeight: responsiveFont(20) },
    bannerCard: { backgroundColor: semanticColors.bgSurface, borderRadius: themeRadii.lg, padding: themeSpacing.lg, borderWidth: 1, borderColor: semanticColors.borderSubtle, flexDirection: 'row', alignItems: 'center', gap: 12 },
    bannerTitle: { fontSize: responsiveFont(16), fontWeight: '800', color: semanticColors.textPrimary, marginBottom: 6 },
    bannerSub: { fontSize: responsiveFont(13), color: semanticColors.textSecondary },
    bannerCta: { backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
    bannerCtaTxt: { fontWeight: '800' },
    connectCardNew: { backgroundColor: semanticColors.bgSurface, borderRadius: themeRadii.lg, padding: themeSpacing.lg, borderWidth: 1, borderColor: semanticColors.borderSubtle, gap: 8 },
    connectTitle: { fontSize: 16, fontWeight: '700', color: semanticColors.textPrimary },
    connectSub: { fontSize: 12, color: semanticColors.textSecondary, marginBottom: 8 },
    connectButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    connectBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
    connectBtnTxt: { fontWeight: '700' },
    resultBox: { borderRadius: 8, padding: 10 },
    resultHdr: { fontWeight: '800', marginBottom: 4 },
    resultTxt: {},
    resultTxtMono: { color: '#ECEFF1', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 12 },
  }), [isDark, colors.background, colors.card, colors.text, colors.textSecondary, colors.border]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Blood Donor",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
      )}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS !== 'ios' && styles.scrollContentWithTabBar
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (match Notification header style) */}
        <LinearGradient
          colors={[theme.primary, '#FF4747']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="heart.fill" size={18} color={semanticColors.textInverse} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: semanticColors.textInverse }]}>Welcome Back!</Text>
                <Text style={[styles.headerSubtitle, { color: semanticColors.textInverse }]}>Save lives, donate blood</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.headerToggle}
              onPress={toggleDark}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Toggle dark mode"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol name="moon.fill" size={18} color={isDark ? '#121212' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statRow}>
          <View style={styles.statCardNew}>
            <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol name={"person.3.fill" as any} size={18} color={colors.primary} />
            </View>
            <Text style={styles.statValueNew}>{totals.donors}</Text>
            <Text style={styles.statLabelNew}>Total Donors</Text>
          </View>
          <View style={styles.statCardNew}>
            <View style={[styles.statIconWrap, { backgroundColor: `${colors.secondary}15` }]}>
              <IconSymbol name={"plus.circle.fill" as any} size={18} color={colors.secondary} />
            </View>
            <Text style={styles.statValueNew}>{totals.requests}</Text>
            <Text style={styles.statLabelNew}>Requests</Text>
          </View>
          <View style={styles.statCardNew}>
            <View style={[styles.statIconWrap, { backgroundColor: `${colors.success}15` }]}>
              <IconSymbol name={"heart.fill" as any} size={18} color={colors.success} />
            </View>
            <Text style={styles.statValueNew}>{totals.saved}</Text>
            <Text style={styles.statLabelNew}>Lives Saved</Text>
          </View>
        </View>

        {/* Quick Actions */}
        {role !== 'none' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleNew}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {/* Request Blood (Primary CTA) */}
            {(role === 'requester' || role === 'both' || role === 'admin') && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => router.push('/createRequest')} activeOpacity={0.9}>
              <LinearGradient colors={[theme.primary, '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
                <View style={[styles.actionIcon, styles.actionIconPrimary]}> 
                  <IconSymbol name="drop.fill" size={20} color={semanticColors.textInverse} />
                </View>
                <Text style={[styles.actionLabel, styles.actionLabelPrimary, { color: semanticColors.textInverse }]}>Request Blood</Text>
              </LinearGradient>
            </TouchableOpacity>
            )}
            {/* Emergency Alert (Pulse emphasis) */}
            {(role === 'requester' || role === 'both' || role === 'admin') && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => router.push('/emergencyRequest')} activeOpacity={0.9}>
              <Animated.View
                style={[styles.actionGradient, styles.actionGradientEmergency, {
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
                  shadowOpacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] })
                }]}
              >
                <View style={[styles.actionIcon, styles.actionIconDanger]}> 
                  <IconSymbol name="bell.fill" size={20} color={semanticColors.textInverse} />
                </View>
                <Text style={[styles.actionLabel, styles.actionLabelDanger, { color: semanticColors.textInverse }]}>Emergency Alert</Text>
              </Animated.View>
            </TouchableOpacity>
            )}
          </View>
        </View>
        )}

        {/* Diagnostics section removed per request */}

        {/* Donor Registration Banner */}
        {(role === 'donor' || role === 'both' || role === 'admin') && (
        <View style={styles.sectionCard}>
          <View style={styles.bannerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Become a Donor</Text>
              <Text style={styles.bannerSub}>Create your donor profile and get matched with people in need.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/donorRegistration')}
              style={styles.bannerCta}
            >
              <Text style={[styles.bannerCtaTxt, { color: semanticColors.textInverse }]}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Blood Donation Tips */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleNew}>Blood Donation Tips</Text>
          {bloodTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: colors.highlight }]}>
                <IconSymbol name={tip.icon as any} size={18} color={theme.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Emergency Banner */}
        {/* <View style={styles.emergencyBanner}>
          <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.warning} />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Emergency Blood Needed</Text>
            <Text style={styles.emergencyText}>O- blood type urgently needed at City Hospital</Text>
          </View>
          <TouchableOpacity style={styles.emergencyButton}>
            <Text style={styles.emergencyButtonText}>Help Now</Text>
          </TouchableOpacity>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
}

// styles created via useMemo for theme reactivity