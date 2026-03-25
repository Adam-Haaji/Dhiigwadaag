
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/IconSymbol';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors, spacing, typography, elevation } from '@/constants/colors';
import HeaderBanner from '@/components/HeaderBanner';
import { useRoleMode } from '@/context/RoleModeContext';
import { ChatbotButton, ChatbotPanel } from '@/components/chatbot';

export default function RequestScreen() {
  const { user, setUser } = useAuth();
  const { role: derivedRole, setActiveMode, markHasDonorRecord } = useRoleMode();
  const [hasRequesterRecord, setHasRequesterRecord] = useState(false);
  const [active, setActive] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { isDark } = useTheme();

  // Check if user has requester record
  const checkRequesterStatus = useCallback(async () => {
    try {
      const requesterData = await api.requesterMe();
      if (requesterData?.exists) {
        setHasRequesterRecord(true);
      } else {
        // No requester record, redirect to role selection
        router.replace('/role');
      }
    } catch (e) {
      // If check fails, redirect to role selection
      router.replace('/role');
    }
  }, []);

  // Load requests
  const load = useCallback(async () => {
    if (!hasRequesterRecord) return;
    setLoading(true);
    setLoadError(null);
    try {
      const legacyRaw: any = await api.listRequests().catch(() => []);
      const legacy: any[] = Array.isArray(legacyRaw)
        ? legacyRaw
        : (Array.isArray(legacyRaw?.requests) ? legacyRaw.requests : []);

      const brRaw: any = await (api as any).listMyBloodRequests?.().catch(() => ({ requests: [] }));
      const bloodRequests: any[] = Array.isArray(brRaw)
        ? brRaw
        : (Array.isArray(brRaw?.requests) ? brRaw.requests : []);

      // Normalize shape so the lists work for both flows.
      const merged = [
        ...legacy.map((r: any) => ({
          _id: r._id,
          patientName: r.patientName,
          bloodType: r.bloodType,
          location: r.location,
          status: r.status,
          __source: 'legacy',
        })),
        ...bloodRequests.map((r: any) => ({
          _id: r._id,
          patientName: r.patientName,
          bloodType: r.bloodGroup || r.bloodType,
          location: r.district || r.location,
          status: r.status,
          __source: 'blood',
        })),
      ];

      const isPast = (status: any) => {
        const s = String(status || '').toLowerCase();
        return ['fulfilled', 'completed', 'cancelled', 'canceled', 'donated'].includes(s);
      };

      const a = merged.filter((r: any) => !isPast(r.status));
      const p = merged.filter((r: any) => isPast(r.status));
      setActive(a);
      setPast(p);
    } catch (e: any) {
      setActive([]);
      setPast([]);
      setLoadError(e?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [hasRequesterRecord]);
  
  useEffect(() => {
    checkRequesterStatus();
  }, [checkRequesterStatus]);

  useEffect(() => {
    if (hasRequesterRecord) {
      load();
    }
  }, [hasRequesterRecord, load]);
  const handleCreateRequest = () => {
    router.push('/createRequest');
  };

  const handleEmergencyRequest = () => {
    router.push('/emergencyRequest');
  };

  // Donors auto-load logic removed; use Emergency Request screen for discovery

  const handleSwitchToDonor = () => {
    if (switching) return;
    setSwitching(true);
    (async () => {
      try {
        await setActiveMode('donor');
        const donorData = await api.donorMe();
        if (derivedRole === 'both' && donorData?.exists) {
          markHasDonorRecord();
          const { setNavigatorRole } = await import('@/service/homeMode');
          await setNavigatorRole('both');
          await setUser({ token: user?.token, user: { ...user?.user, role: 'both' } });
          router.replace('/(home)/donor');
          return;
        }
        if (donorData?.exists) {
          markHasDonorRecord();
          const { setNavigatorRole } = await import('@/service/homeMode');
          await setNavigatorRole('both');
          await setUser({ token: user?.token, user: { ...user?.user, role: 'both' } });
          router.replace('/(home)/donor');
          return;
        }
        router.push('/donorRegistration');
      } catch {
        router.push('/donorRegistration');
      } finally {
        setSwitching(false);
      }
    })();
  };


  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 0, paddingVertical: 0, paddingBottom: spacing.xxl },
    scrollContentWithTabBar: { paddingBottom: 100 },
    headerGradient: {
      // legacy header container (no longer used)
      marginBottom: spacing.lg,
    },
    headerBannerWrap: {
      alignSelf: 'center',
      width: '92%',
      marginBottom: spacing.lg,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconWrap: { 
      width: 48, 
      height: 48, 
      borderRadius: 24, 
      backgroundColor: 'rgba(255,255,255,0.25)', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginRight: spacing.md,
      ...elevation.none,
    },
    headerTitle: { 
      color: semanticColors.textInverse, 
      ...typography.h2,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    headerSubtitle: { 
      color: semanticColors.textInverse, 
      ...typography.bodySmall,
      fontWeight: '500',
      marginTop: spacing.xs / 2,
      opacity: 0.95,
    },
    card: { 
      backgroundColor: semanticColors.bgSurface, 
      borderRadius: 16, 
      borderWidth: 1, 
      borderColor: semanticColors.borderSubtle, 
      padding: spacing.lg, 
      marginHorizontal: spacing.lg, 
      marginBottom: spacing.md, 
      ...elevation.none,
    },
    dashboardCard: { 
      backgroundColor: semanticColors.bgSurface, 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: semanticColors.borderSubtle, 
      padding: spacing.lg, 
      marginHorizontal: spacing.lg, 
      marginBottom: spacing.md,
      ...elevation.sm,
    },
    switchBtn: { 
      alignSelf: 'center', 
      backgroundColor: semanticColors.bgSurface, 
      paddingHorizontal: spacing.lg, 
      paddingVertical: spacing.md, 
      borderRadius: 12, 
      marginHorizontal: spacing.lg, 
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      ...elevation.none,
    },
    switchBtnText: { 
      color: semanticColors.textPrimary, 
      ...typography.label,
      fontWeight: '600',
    },
    dashboardTitle: { 
      ...typography.h4,
      fontWeight: '700', 
      color: semanticColors.textPrimary, 
      marginBottom: spacing.md,
      letterSpacing: -0.2,
    },
    dashboardRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
    },
    dashboardLabel: { 
      ...typography.label,
      color: semanticColors.textSecondary,
      fontWeight: '500',
    },
    dashboardValue: { 
      ...typography.body,
      fontWeight: '600', 
      color: semanticColors.textPrimary,
    },
    emergencyCard: { 
      backgroundColor: `${semanticColors.interactiveDanger}12`,
      borderColor: `${semanticColors.interactiveDanger}30`,
    },
    cardRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: spacing.md,
    },
    iconBadge: { 
      width: 52, 
      height: 52, 
      borderRadius: 16, 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginRight: spacing.md,
      ...elevation.none,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    cardTextWrap: { flex: 1 },
    cardTitle: { 
      ...typography.body,
      fontWeight: '600', 
      color: semanticColors.textPrimary,
      fontSize: 17,
    },
    cardSubtitle: { 
      marginTop: spacing.xs, 
      color: semanticColors.textSecondary, 
      ...typography.caption,
      lineHeight: 18,
    },
    primaryBtn: { 
      height: 50, 
      borderRadius: 12, 
      alignItems: 'center', 
      justifyContent: 'center',
      ...elevation.none,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    primaryBtnText: { 
      color: semanticColors.textInverse, 
      ...typography.label,
      fontWeight: '600',
    },
    sectionCard: { 
      backgroundColor: semanticColors.bgSurface, 
      borderRadius: 16, 
      borderWidth: 1, 
      borderColor: semanticColors.borderSubtle, 
      padding: spacing.lg, 
      marginHorizontal: spacing.lg, 
      marginBottom: spacing.lg,
      ...elevation.none,
    },
    actionsRow: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md },
    actionCard: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle, backgroundColor: semanticColors.bgSurface, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    actionLabel: { ...typography.bodySmall, color: semanticColors.textPrimary, fontWeight: '600' },
    sectionTitle: { 
      ...typography.h4,
      fontWeight: '700', 
      color: semanticColors.textPrimary, 
      marginBottom: spacing.md,
      letterSpacing: -0.2,
    },
    emptyText: { 
      ...typography.bodySmall,
      color: semanticColors.textSecondary,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    listItem: { 
      borderTopWidth: 1, 
      borderTopColor: semanticColors.borderSubtle, 
      paddingVertical: spacing.md,
    },
    listItemTitle: { 
      ...typography.bodySmall,
      fontWeight: '600', 
      color: semanticColors.textPrimary,
    },
    listItemSub: { 
      ...typography.caption,
      color: semanticColors.textSecondary, 
      marginTop: spacing.xs / 2,
    },
    viewBtn: { 
      marginTop: spacing.sm, 
      alignSelf: 'flex-start', 
      backgroundColor: semanticColors.interactivePrimaryActive, 
      paddingHorizontal: spacing.md, 
      paddingVertical: spacing.sm, 
      borderRadius: 10,
      ...elevation.sm,
    },
    viewBtnTxt: { 
      color: semanticColors.textInverse, 
      ...typography.caption,
      fontWeight: '600',
    },
    tipRow: { 
      flexDirection: 'row', 
      alignItems: 'flex-start', 
      marginBottom: spacing.md,
    },
    bullet: { 
      width: 6, 
      height: 6, 
      borderRadius: 3, 
      backgroundColor: semanticColors.interactivePrimary, 
      marginTop: 7, 
      marginRight: spacing.md,
    },
    tipText: { 
      flex: 1, 
      ...typography.bodySmall,
      color: semanticColors.textPrimary, 
      lineHeight: 22,
    },
  }), [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Blood Requests",
            headerStyle: { backgroundColor: semanticColors.bgAlt },
            headerTintColor: semanticColors.textPrimary,
          }}
        />
      )}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS !== 'ios' && styles.scrollContentWithTabBar
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Unified top banner */}
        <HeaderBanner style={styles.headerBannerWrap}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="clipboard" size={18} color={semanticColors.textInverse} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Request Blood</Text>
                <Text style={styles.headerSubtitle}>Get help when you need it</Text>
              </View>
            </View>
          </View>
        </HeaderBanner>

        {/* Switch Role */}
        <TouchableOpacity 
          style={styles.switchBtn} 
          onPress={handleSwitchToDonor}
          activeOpacity={0.7}
        >
          <Text style={styles.switchBtnText}>Switch to Donor</Text>
        </TouchableOpacity>


        {/* Side-by-side action cards */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={handleCreateRequest}>
            <Ionicons name="document-text-outline" size={20} color={semanticColors.textPrimary} />
            <Text style={styles.actionLabel}>Create Request</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, styles.emergencyCard]} onPress={handleEmergencyRequest}>
            <IconSymbol name="phone.fill" size={18} color={semanticColors.interactiveDanger} />
            <Text style={styles.actionLabel}>Emergency Request</Text>
          </TouchableOpacity>
        </View>

        {/* Active Requests List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Active Requests</Text>
          {active.length === 0 && <Text style={styles.emptyText}>No active requests.</Text>}
          {active.map(r => (
            <View key={r._id} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{r.patientName || r.bloodType}</Text>
              <Text style={styles.listItemSub}>{r.status}</Text>
              <TouchableOpacity onPress={() => router.push(`/requestStatus?id=${r._id}`)} style={styles.viewBtn}>
                <Text style={styles.viewBtnTxt}>View</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Past Requests List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Past Requests</Text>
          {past.length === 0 && <Text style={styles.emptyText}>No past requests.</Text>}
          {past.map(r => (
            <View key={r._id} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{r.patientName || r.bloodType}</Text>
              <Text style={styles.listItemSub}>{r.status}</Text>
            </View>
          ))}
        </View>

        {/* Available Donors section removed per request; use Emergency screen for donor search */}

      </ScrollView>

      {/* Floating chatbot — Requester Assistant */}
      {hasRequesterRecord && (
        <>
          <ChatbotButton onPress={() => setChatOpen(true)} />
          <ChatbotPanel visible={chatOpen} onClose={() => setChatOpen(false)} />
        </>
      )}
    </SafeAreaView>
  );
}

// styles now theme-reactive via useMemo
