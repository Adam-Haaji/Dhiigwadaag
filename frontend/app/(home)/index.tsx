import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router } from "expo-router";
import { ScrollView, StyleSheet, View, Text, Platform, TouchableOpacity, Animated, RefreshControl, Pressable } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, commonStyles } from "@/styles/commonStyles";
import { api } from "@/service/api";
import { colors as theme, spacing as themeSpacing, radii as themeRadii, moderateScale, responsiveFont } from "@/constants/theme";
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';
import HeaderBanner from '@/components/HeaderBanner';
import { Ionicons } from '@expo/vector-icons';
import { useRoleMode } from '@/context/RoleModeContext';
import { goToMatchedRequests } from '@/service/matchedRequestsNavigation';
// Connectivity diagnostics removed per request

// Lazy-load LinearGradient like in Notifications to keep consistent header rendering
let LinearGradient: any;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch { LinearGradient = View; }

// HomeGate: single Home tab always uses one resolved mode. For role="both" we ALWAYS show DonorHome (no flicker).
function useHomeGateMode(): 'donor' | 'requester' {
  const { role } = useRoleMode();
  return role === 'both' || role === 'donor' ? 'donor' : 'requester';
}

export default function HomeIndex() {
  const { user } = require('@/hooks/useAuth').default();
  const role = String(user?.user?.role || '').toLowerCase();
  const { isDark, toggleDark } = useTheme();
  // Single source for what to show on Home tab: role-based, no async, no bounce.
  const effectiveHomeMode = useHomeGateMode();

  // Lightweight entrance animation for body content (visual only)
  const bodyIntro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bodyIntro, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [bodyIntro]);

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

  // Donor status data (for donor dashboard)
  const [donorProfile, setDonorProfile] = useState<any>(null);
  const [hasDonorRecord, setHasDonorRecord] = useState(false);
  
  // Requester requests data (for requester dashboard)
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [hasRequesterRecord, setHasRequesterRecord] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isDonorCapable = hasDonorRecord || role === 'donor' || role === 'both' || role === 'admin';
  const isRequesterCapable = hasRequesterRecord || role === 'requester' || role === 'both' || role === 'admin';

  // Check record existence (used for Home separation; does not change backend/endpoints)
  const checkRecords = useCallback(async () => {
    try {
      const d = await api.donorMe();
      setHasDonorRecord(!!d?.exists);
      if (d?.exists && d?.donor) setDonorProfile(d.donor);
    } catch {
      setHasDonorRecord(false);
    }
    try {
      const r = await api.requesterMe();
      setHasRequesterRecord(!!r?.exists);
    } catch {
      setHasRequesterRecord(false);
    }
  }, []);

  // Load donor profile if user is a donor
  const loadDonorProfile = useCallback(async () => {
    if (!isDonorCapable) return;
    try {
      const donorData = await api.donorMe();
      if (donorData?.exists && donorData?.donor) {
        setHasDonorRecord(true);
        setDonorProfile(donorData.donor);
      }
    } catch {}
  }, [role]);

  // Load recent requests if user is a requester
  const loadRecentRequests = useCallback(async () => {
    if (!isRequesterCapable) return;
    try {
      const requesterData = await api.requesterMe();
      if (requesterData?.exists) {
        setHasRequesterRecord(true);
      }

      const legacyRaw: any = await api.listRequests().catch(() => []);
      const legacy: any[] = Array.isArray(legacyRaw)
        ? legacyRaw
        : (Array.isArray(legacyRaw?.requests) ? legacyRaw.requests : []);

      const brRaw: any = await (api as any).listMyBloodRequests?.().catch(() => ({ requests: [] }));
      const bloodRequests: any[] = Array.isArray(brRaw)
        ? brRaw
        : (Array.isArray(brRaw?.requests) ? brRaw.requests : []);

      const merged = [
        ...legacy.map((r: any) => ({
          _id: r._id,
          patientName: r.patientName,
          bloodType: r.bloodType,
          location: r.location,
          status: r.status,
          createdAt: r.createdAt,
        })),
        ...bloodRequests.map((r: any) => ({
          _id: r._id,
          patientName: r.patientName,
          bloodType: r.bloodGroup || r.bloodType,
          location: r.district || r.location,
          status: r.status,
          createdAt: r.createdAt,
        })),
      ];

      // Get last 3 requests, sorted by date
      const sorted = merged.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setRecentRequests(sorted.slice(0, 3));
    } catch {}
  }, [role]);

  useEffect(() => {
    checkRecords();
  }, [loadDonorProfile, loadRecentRequests]);

  useFocusEffect(useCallback(() => {
    checkRecords();
    loadDonorProfile();
    loadRecentRequests();
  }, [loadDonorProfile, loadRecentRequests]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([checkRecords(), loadDonorProfile(), loadRecentRequests()]);
    } finally {
      setRefreshing(false);
    }
  }, [checkRecords, loadDonorProfile, loadRecentRequests]);

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

  // Visual-only blood group quick-view
  const bloodGroups = useMemo(() => (['A+','A-','B+','B-','AB+','AB-','O+','O-'] as const), []);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semanticColors.bgAlt,
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: themeSpacing.xl, paddingVertical: themeSpacing.lg },
    scrollContentWithTabBar: { paddingBottom: 100 },
    headerGradient: {
      // legacy gradient container (kept to minimize churn), no longer used
      marginBottom: themeSpacing.md,
    },
    headerBannerWrap: {
      alignSelf: 'center',
      width: '92%',
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
    statusSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: themeSpacing.md },
    statusSummaryItem: { flex: 1, backgroundColor: semanticColors.bgAlt, borderRadius: themeRadii.md, padding: themeSpacing.md, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    statusSummaryLabel: { fontSize: responsiveFont(12), color: semanticColors.textSecondary, marginBottom: 4, fontWeight: '500' },
    statusSummaryValue: { fontSize: responsiveFont(14), fontWeight: '600', color: semanticColors.textPrimary },
    requestPreviewItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingVertical: themeSpacing.md, 
      borderBottomWidth: 1, 
      borderBottomColor: semanticColors.borderSubtle,
    },
    requestPreviewTitle: { fontSize: responsiveFont(15), fontWeight: '600', color: semanticColors.textPrimary, marginBottom: 4 },
    requestPreviewMeta: { fontSize: responsiveFont(12), color: semanticColors.textSecondary },
    requestPreviewButton: { 
      backgroundColor: theme.primary, 
      paddingVertical: 8, 
      paddingHorizontal: 16, 
      borderRadius: 8,
    },
    requestPreviewButtonText: { 
      color: semanticColors.textInverse, 
      fontSize: responsiveFont(12), 
      fontWeight: '600',
    },
    emptyState: { 
      alignItems: 'center', 
      justifyContent: 'center', 
      paddingVertical: themeSpacing.xl,
    },
    emptyStateText: { 
      fontSize: responsiveFont(14), 
      color: semanticColors.textSecondary, 
      marginTop: themeSpacing.sm,
    },
    sectionCard: { backgroundColor: semanticColors.bgSurface, borderRadius: themeRadii.lg, borderWidth: 1, borderColor: semanticColors.borderSubtle, padding: themeSpacing.lg, marginBottom: themeSpacing.lg },
    sectionTitleNew: { fontSize: responsiveFont(16), fontWeight: '700', color: semanticColors.textPrimary, marginBottom: themeSpacing.md },

    // Requester tips
    requesterTips: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: themeRadii.lg,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      padding: themeSpacing.lg,
      marginBottom: themeSpacing.lg,
    },
    requesterTipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: themeSpacing.md,
      paddingVertical: themeSpacing.sm,
    },
    requesterTipIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      marginTop: 2,
    },
    requesterTipTitle: {
      fontSize: responsiveFont(14),
      fontWeight: '800',
      color: semanticColors.textPrimary,
      marginBottom: 2,
    },
    requesterTipText: {
      fontSize: responsiveFont(12.5),
      color: semanticColors.textSecondary,
      lineHeight: responsiveFont(18),
    },

    // Blood Group quick-view (visual only)
    bloodSection: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: themeRadii.lg,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      padding: themeSpacing.lg,
      marginBottom: themeSpacing.lg,
    },
    bloodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: themeSpacing.md,
      justifyContent: 'space-between',
    },
    bloodTile: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: themeSpacing.sm,
    },
    bloodTilePressed: {
      transform: [{ scale: 0.98 }],
      backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.05)',
    },
    bloodIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      backgroundColor: isDark ? 'rgba(229,57,53,0.18)' : 'rgba(229,57,53,0.10)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(229,57,53,0.28)' : 'rgba(229,57,53,0.18)',
    },
    bloodLabel: {
      fontSize: responsiveFont(12),
      fontWeight: '800',
      color: semanticColors.textPrimary,
      letterSpacing: 0.2,
    },

    // Premium tips list (only for Blood Donation Tips section)
    tipsList: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: themeRadii.lg,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      overflow: 'hidden',
    },
    tipItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: themeSpacing.md,
      paddingHorizontal: themeSpacing.md,
      backgroundColor: 'transparent',
    },
    tipItemPressed: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    },
    tipDivider: {
      height: 1,
      backgroundColor: semanticColors.borderSubtle,
      marginLeft: themeSpacing.md,
    },
    tipIconWrapNew: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: themeSpacing.md,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    tipTitleNew: {
      fontSize: responsiveFont(15),
      fontWeight: '800',
      color: semanticColors.textPrimary,
      marginBottom: 2,
    },
    tipDescNew: {
      fontSize: responsiveFont(12.5),
      color: semanticColors.textSecondary,
      lineHeight: responsiveFont(18),
    },
    actionsRow: { flexDirection: 'row', gap: themeSpacing.md, justifyContent: 'space-between' },
    actionBtn: { flex: 1, borderRadius: themeRadii.lg, overflow: 'hidden' },
    actionGradient: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: moderateScale(themeSpacing.lg), paddingHorizontal: moderateScale(themeSpacing.md), gap: moderateScale(8) },
    actionBtnPrimary: { backgroundColor: theme.primary },
    actionBtnDanger: { backgroundColor: '#E53935' },
    actionGradientEmergency: { backgroundColor: '#E53935' },
    actionIcon: { width: moderateScale(42), height: moderateScale(42), borderRadius: moderateScale(21), alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.18)' },
    actionIconDanger: { backgroundColor: 'rgba(255,255,255,0.18)' },
    actionLabel: { fontSize: responsiveFont(13), fontWeight: '600' },
    actionLabelPrimary: { letterSpacing: 0.3 },
    actionLabelDanger: { letterSpacing: 0.3 },
    tipCard: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
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
        {/* Unified top banner */}
        <HeaderBanner style={styles.headerBannerWrap}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol
                  name={effectiveHomeMode === 'donor' ? 'heart.fill' : 'drop.fill'}
                  size={18}
                  color={semanticColors.textInverse}
                />
              </View>
              <View>
                {effectiveHomeMode === 'donor' ? (
                  <>
                    <Text style={[styles.headerTitle, { color: semanticColors.textInverse }]}>Welcome Back!</Text>
                    <Text style={[styles.headerSubtitle, { color: semanticColors.textInverse }]}>Save lives, donate blood</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.headerTitle, { color: semanticColors.textInverse }]}>Need Blood?</Text>
                    <Text style={[styles.headerSubtitle, { color: semanticColors.textInverse }]}>Create a request and reach donors fast</Text>
                  </>
                )}
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
        </HeaderBanner>

        {effectiveHomeMode === 'donor' && (
          <>
            {/* Blood Group quick-view (donor home only) */}
            <Animated.View
              style={{
                opacity: bodyIntro,
                transform: [
                  {
                    translateY: bodyIntro.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                  },
                ],
              }}
            >
              <View style={styles.bloodSection}>
                <Text style={styles.sectionTitleNew}>Blood Group</Text>
                <View style={styles.bloodGrid}>
                  {bloodGroups.map((bg) => (
                    <Pressable
                      key={bg}
                      onPress={() => {}}
                      accessibilityRole="button"
                      accessibilityLabel={`Blood group ${bg}`}
                      style={({ pressed }) => [styles.bloodTile, pressed && styles.bloodTilePressed]}
                    >
                      <View style={styles.bloodIconWrap}>
                        <Ionicons name="water" size={16} color={isDark ? '#FFB3B3' : '#C62828'} />
                      </View>
                      <Text style={styles.bloodLabel}>{bg}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* Primary Actions */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitleNew}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionBtnPrimary]} 
                  onPress={() => { goToMatchedRequests(role); }} 
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={[theme.primary, '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
                    <View style={[styles.actionIcon, styles.actionIconPrimary]}> 
                      <IconSymbol name="bell.fill" size={20} color={semanticColors.textInverse} />
                    </View>
                    <Text style={[styles.actionLabel, styles.actionLabelPrimary, { color: semanticColors.textInverse }]}>View Matched Requests</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Blood Donation Tips (donor home only) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitleNew}>Blood Donation Tips</Text>
              <View style={styles.tipsList}>
                {bloodTips.map((tip, index) => {
                  const icon = tip.title === 'Stay Hydrated'
                    ? 'water'
                    : (tip.title === 'Eat Iron-Rich Foods' ? 'leaf' : 'moon');
                  const tint = tip.title === 'Stay Hydrated'
                    ? (isDark ? '#8EC5FF' : '#1976D2')
                    : (tip.title === 'Eat Iron-Rich Foods' ? (isDark ? '#A5F3C4' : '#2E7D32') : (isDark ? '#FFD59A' : '#F9A825'));
                  const bg = isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.03)';
                  return (
                    <View key={index}>
                      <Pressable
                        onPress={() => {}}
                        accessibilityRole="button"
                        accessibilityLabel={tip.title}
                        style={({ pressed }) => [styles.tipItem, pressed && styles.tipItemPressed]}
                      >
                        <View style={[styles.tipIconWrapNew, { backgroundColor: bg }]}>
                          <Ionicons name={icon as any} size={18} color={tint} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tipTitleNew}>{tip.title}</Text>
                          <Text style={styles.tipDescNew}>{tip.description}</Text>
                        </View>
                      </Pressable>
                      {index !== bloodTips.length - 1 && <View style={styles.tipDivider} />}
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {effectiveHomeMode === 'requester' && (
          <>
            {/* How to Request Blood */}
            <View style={styles.requesterTips}>
              <Text style={styles.sectionTitleNew}>How to Request Blood</Text>
              <View style={styles.requesterTipRow}>
                <View style={styles.requesterTipIcon}>
                  <Ionicons name="create-outline" size={18} color={isDark ? '#FFB3B3' : '#C62828'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requesterTipTitle}>Fill accurate details</Text>
                  <Text style={styles.requesterTipText}>Patient name, blood group, district, and contact phone help donors respond quickly.</Text>
                </View>
              </View>
              <View style={styles.tipDivider} />
              <View style={styles.requesterTipRow}>
                <View style={styles.requesterTipIcon}>
                  <Ionicons name="call-outline" size={18} color={isDark ? '#8EC5FF' : '#1976D2'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requesterTipTitle}>Be reachable</Text>
                  <Text style={styles.requesterTipText}>Keep your phone available so matched donors can call or WhatsApp you.</Text>
                </View>
              </View>
              <View style={styles.tipDivider} />
              <View style={styles.requesterTipRow}>
                <View style={styles.requesterTipIcon}>
                  <Ionicons name="alert-circle-outline" size={18} color={isDark ? '#FFD59A' : '#F9A825'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requesterTipTitle}>Use Emergency when urgent</Text>
                  <Text style={styles.requesterTipText}>Emergency Request is best when you need donors immediately.</Text>
                </View>
              </View>
            </View>

            {/* Requester Quick Actions */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitleNew}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionBtnPrimary]} 
                  onPress={() => router.push('/createRequest')} 
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={[theme.primary, '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
                    <View style={[styles.actionIcon, styles.actionIconPrimary]}> 
                      <IconSymbol name="drop.fill" size={20} color={semanticColors.textInverse} />
                    </View>
                    <Text style={[styles.actionLabel, styles.actionLabelPrimary, { color: semanticColors.textInverse }]}>Create Blood Request</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionBtnDanger]} 
                  onPress={() => router.push('/emergencyRequest')} 
                  activeOpacity={0.9}
                >
                  <Animated.View
                    style={[styles.actionGradient, styles.actionGradientEmergency, {
                      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
                      shadowOpacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] })
                    }]}
                  >
                    <View style={[styles.actionIcon, styles.actionIconDanger]}> 
                      <IconSymbol name="bell.fill" size={20} color={semanticColors.textInverse} />
                    </View>
                    <Text style={[styles.actionLabel, styles.actionLabelDanger, { color: semanticColors.textInverse }]}>Emergency Request</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>

            {/* My Recent Requests Preview */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitleNew}>My Recent Requests</Text>
              {recentRequests.length > 0 ? (
                recentRequests.map((req: any, index: number) => (
                  <View key={req._id || index} style={styles.requestPreviewItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestPreviewTitle}>{req.patientName || 'Patient'}</Text>
                      <Text style={styles.requestPreviewMeta}>
                        {req.bloodType} • {req.location} • {req.status}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => router.push(`/(home)/request`)}
                      style={styles.requestPreviewButton}
                    >
                      <Text style={styles.requestPreviewButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol name="doc.text" size={32} color={semanticColors.textSecondary} />
                  <Text style={styles.emptyStateText}>No requests yet.</Text>
                </View>
              )}
            </View>

            {/* Help/Info Card */}
            <View style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: `${colors.warning}15` }]}>
                <IconSymbol name="lightbulb.fill" size={18} color={colors.warning} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Tip</Text>
                <Text style={styles.tipDescription}>Use Emergency Request when you need donors immediately.</Text>
              </View>
            </View>
          </>
        )}


        {/* Diagnostics section removed per request */}

        {/* Donor Registration Banner removed: donor already completed registration before accessing dashboard */}

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