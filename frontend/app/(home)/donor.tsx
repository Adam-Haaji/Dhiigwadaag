
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import colorsBase, { semanticColors, spacing, typography, elevation } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import HeaderBanner from '@/components/HeaderBanner';
import { useRoleMode } from '@/context/RoleModeContext';
import { goToMatchedRequests } from '@/service/matchedRequestsNavigation';

export default function DonorDashboard() {
  const { user, setUser } = useAuth();
  const { role: derivedRole, setActiveMode, markHasRequesterRecord } = useRoleMode();
  const { isDark } = useTheme();
  const [switching, setSwitching] = useState(false);
  const [hasDonorRecord, setHasDonorRecord] = useState(false);
  const [donorProfile, setDonorProfile] = useState<{ bloodGroup?: string; phone?: string; email?: string; district?: string; availabilityStatus?: string; lastDonationDate?: string; nextAvailableDate?: string; medicalCondition?: string; eligibilityStatus?: string; eligibilityReason?: string; eligibilityConfidence?: number; eligibilityConfidencePercent?: number; eligibilityCheckedAt?: string } | null>(null);
  const role = String(user?.user?.role || '').toLowerCase();
  const donorStatus = String(user?.user?.donorStatus || 'not_a_donor');
  const unavailableUntil = user?.user?.unavailableUntil ? new Date(user.user.unavailableUntil) : null;
  const lastDonationDate = user?.user?.lastDonationDate ? new Date(user.user.lastDonationDate) : null;
  const ineligibilityReason = user?.user?.ineligibilityReason || null;
  const [history, setHistory] = useState<{ donationDate: string; volumeMl?: number; screeningClear?: boolean }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Function to refresh donor profile
  const refreshDonorProfile = useCallback(async () => {
    try {
      const donorData = await api.donorMe();
      if (donorData?.exists && donorData?.donor) {
        setHasDonorRecord(true);
        setDonorProfile(donorData.donor);
      } else {
        // Check donorStatus or role (legacy support)
        const isDonor = 
          (donorStatus !== 'not_a_donor' && donorStatus !== '') || 
          role === 'donor' || 
          role === 'both' || 
          role === 'admin';
        setHasDonorRecord(isDonor);
        // Only redirect if definitely not a donor (allow access during registration flow)
        if (!isDonor && role !== 'none') {
          // Small delay to allow registration to complete
          setTimeout(() => {
            router.replace('/donorRegistration');
          }, 100);
        }
      }
    } catch (e) {
      // Fallback to role check
      const isDonor = 
        (donorStatus !== 'not_a_donor' && donorStatus !== '') || 
        role === 'donor' || 
        role === 'both' || 
        role === 'admin';
      setHasDonorRecord(isDonor);
      if (!isDonor && role !== 'none') {
        setTimeout(() => {
          router.replace('/donorRegistration');
        }, 100);
      }
    }
  }, [role, donorStatus]);

  // Check if user has donor record and load profile (for role separation)
  // Only refresh on focus to avoid duplicate calls
  useFocusEffect(
    useCallback(() => {
      refreshDonorProfile();
    }, [refreshDonorProfile])
  );

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!hasDonorRecord && !(role === 'donor' || role === 'both' || role === 'admin')) return;
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const res = await api.getMyDonations();
        if (cancelled) return;
        const donations = Array.isArray(res?.donations) ? res.donations : [];
        // Sort newest first by date
        donations.sort((a: any, b: any) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime());
        setHistory(donations);
      } catch (e: any) {
        if (!cancelled) setHistoryError(e?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [role, hasDonorRecord]);

  // My Status: Unavailable ONLY if (1) in donation cooldown OR (2) NOT_ELIGIBLE; else Available
  const statusBadge = useMemo(() => {
    if (!hasDonorRecord) return 'Not a donor';
    const now = new Date();
    const nextAvail = donorProfile?.nextAvailableDate ? new Date(donorProfile.nextAvailableDate) : null;
    const userUnavail = unavailableUntil ? new Date(unavailableUntil) : null;
    const isInCooldown = (nextAvail && nextAvail.getTime() > now.getTime()) || (userUnavail && userUnavail.getTime() > now.getTime());
    const elig = donorProfile?.eligibilityStatus;
    const isNotEligible = elig === 'NOT_ELIGIBLE' || elig === 'not_eligible';
    return (isInCooldown || isNotEligible) ? 'Unavailable' : 'Available';
  }, [hasDonorRecord, donorProfile?.nextAvailableDate, donorProfile?.eligibilityStatus, unavailableUntil]);

  // Last donation: prefer donor profile (from API), then most recent from donation history, then user
  const lastDonationDisplay = useMemo(() => {
    const fromProfile = donorProfile?.lastDonationDate;
    if (fromProfile) return new Date(fromProfile).toLocaleDateString();
    const fromHistory = history?.[0]?.donationDate;
    if (fromHistory) return new Date(fromHistory).toLocaleDateString();
    if (lastDonationDate) return lastDonationDate.toLocaleDateString();
    return null;
  }, [donorProfile?.lastDonationDate, history, lastDonationDate]);

  const handleViewMatches = async () => {
    await goToMatchedRequests(role);
  };
  const handleSwitchToRequester = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      await setActiveMode('requester');
      let requesterData;
      try {
        requesterData = await api.requesterMe();
      } catch {}

      if (derivedRole === 'both' && requesterData?.exists) {
        markHasRequesterRecord();
        router.replace('/(home)/request');
        return;
      }

      if (!requesterData?.exists) {
        requesterData = await api.requesterRegister();
      }

      if (requesterData?.exists || requesterData?.requester || requesterData?.user) {
        markHasRequesterRecord();
      }

      const token = user?.token;
      const { setNavigatorRole } = await import('@/service/homeMode');
      await setNavigatorRole('both');
      await setUser({
        token,
        user: {
          ...user?.user,
          role: 'both',
          email: requesterData?.user?.email ?? user?.user?.email,
          phone: requesterData?.user?.phone ?? user?.user?.phone,
          name: requesterData?.user?.name ?? user?.user?.name,
        },
      });
      router.replace('/(home)/request');
    } catch (e) {
      const { setNavigatorRole } = await import('@/service/homeMode');
      await setNavigatorRole('both');
      await setUser({ token: user?.token, user: { ...user?.user, role: 'both' } });
      router.replace('/(home)/request');
    } finally {
      setSwitching(false);
    }
  };


  const styles = useMemo(() => makeStyles(), [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={semanticColors.bgAlt} />
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Become a Donor",
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
        {/* Header Section - unified banner */}
        <HeaderBanner style={styles.headerBannerWrap}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="drop.fill" size={18} color={semanticColors.textInverse} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: semanticColors.textInverse }]}>Donor Dashboard</Text>
                <Text style={[styles.headerSubtitle, { color: semanticColors.textInverse }]}>Your donation status</Text>
              </View>
            </View>
          </View>
        </HeaderBanner>

        {/* Secondary actions: subtle side-by-side cards */}
        <View style={styles.actionsRow}>
          {hasDonorRecord && (
            <TouchableOpacity style={styles.actionCard} onPress={handleSwitchToRequester} disabled={switching}>
              <IconSymbol name="arrow.right.arrow.left.circle.fill" size={18} color={semanticColors.textPrimary} />
              <Text style={styles.actionLabel}>{switching ? 'Switching...' : 'Switch to Requester'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionCard} onPress={handleViewMatches}>
            <IconSymbol name="bell" size={18} color={semanticColors.textPrimary} />
            <Text style={styles.actionLabel}>View Matched Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>My Status</Text>
          <Text style={[styles.statusValue, statusBadge === 'Unavailable' && { color: semanticColors.interactiveDanger }]}>{statusBadge}</Text>
          <View style={styles.statusRow}><Text style={styles.statusLabel}>Last Donation:</Text><Text style={styles.statusText}>{lastDonationDisplay ?? '—'}</Text></View>
          <View style={styles.statusRow}><Text style={styles.statusLabel}>Next Eligibility:</Text><Text style={styles.statusText}>{donorProfile?.nextAvailableDate ? new Date(donorProfile.nextAvailableDate).toLocaleDateString() : (unavailableUntil ? unavailableUntil.toLocaleDateString() : 'Eligible now')}</Text></View>
          {donorStatus === 'ineligible' && ineligibilityReason && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.ineligibleHeading}>Ineligible Reason</Text>
              <Text style={styles.ineligibleText}>{ineligibilityReason}</Text>
              <Text style={styles.ineligibleHint}>Learn more about requirements to become eligible again.</Text>
            </View>
          )}
        </View>

        {/* Eligibility Status Card */}
        {hasDonorRecord && donorProfile && (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Eligibility Status</Text>
            
            {/* Medical Condition - Always show with placeholder */}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Medical Condition:</Text>
              <Text 
                style={[styles.statusText, { textAlign: 'right', flexShrink: 1, minWidth: 0 }]} 
                numberOfLines={2} 
                ellipsizeMode="tail"
              >
                {donorProfile.medicalCondition || '—'}
              </Text>
            </View>
            
            {/* Status: from DB only — ELIGIBLE/eligible, NOT_ELIGIBLE/not_eligible, UNKNOWN, pending */}
            {(() => {
              const s = donorProfile.eligibilityStatus;
              const isEligible = s === 'ELIGIBLE' || s === 'eligible';
              const isNotEligible = s === 'NOT_ELIGIBLE' || s === 'not_eligible';
              const isUnknown = s === 'UNKNOWN';
              const isPending = s === 'pending' || !s;
              let statusText = 'Checking eligibility...';
              if (isEligible) statusText = 'Eligible to Donate';
              else if (isNotEligible) statusText = 'Not Eligible to Donate';
              else if (isUnknown) statusText = 'Eligibility check unavailable. Please try again.';
              return (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexShrink: 1, minWidth: 0, maxWidth: '75%' }}>
                    {isEligible && <IconSymbol name="checkmark.circle.fill" size={16} color="#16A34A" />}
                    {isNotEligible && <IconSymbol name="xmark.circle.fill" size={16} color={semanticColors.interactiveDanger} />}
                    {isUnknown && <IconSymbol name="exclamationmark.triangle.fill" size={16} color={semanticColors.textSecondary} />}
                    {isPending && <IconSymbol name="clock.fill" size={16} color={semanticColors.textSecondary} />}
                    <Text style={[styles.statusText, {
                      color: isEligible ? '#16A34A' : isNotEligible ? semanticColors.interactiveDanger : semanticColors.textSecondary,
                      marginLeft: 4, fontWeight: '600', textAlign: 'right', flexShrink: 1
                    }]} numberOfLines={2} ellipsizeMode="tail">{statusText}</Text>
                  </View>
                </View>
              );
            })()}
            
            {/* Reason: show model reason when we have a stored result */}
            {(donorProfile.eligibilityReason && (donorProfile.eligibilityStatus === 'ELIGIBLE' || donorProfile.eligibilityStatus === 'eligible' || donorProfile.eligibilityStatus === 'NOT_ELIGIBLE' || donorProfile.eligibilityStatus === 'not_eligible')) && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Reason:</Text>
                <Text style={[styles.statusText, { textAlign: 'right', flex: 1, flexShrink: 1, minWidth: 0 }]} numberOfLines={3} ellipsizeMode="tail">
                  {donorProfile.eligibilityReason}
                </Text>
              </View>
            )}
            
            {/* Message Banner - only for definite results or UNKNOWN */}
            {(() => {
              const s = donorProfile.eligibilityStatus;
              const isEligible = s === 'ELIGIBLE' || s === 'eligible';
              const isNotEligible = s === 'NOT_ELIGIBLE' || s === 'not_eligible';
              const isUnknown = s === 'UNKNOWN';
              const medicalCondition = donorProfile.medicalCondition || 'None';
              const isNotNone = medicalCondition !== 'None' && medicalCondition.trim() !== '';
              if (isNotNone && isNotEligible) {
                return (
                  <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colorsBase.palette.dangerLight, borderRadius: 12, borderWidth: 1, borderColor: colorsBase.palette.danger + '40' }}>
                    <Text style={{ ...typography.bodySmall, color: colorsBase.palette.dangerDark, lineHeight: 22, fontWeight: '500' }}>
                      Medical condition reported. Donor is not eligible to donate at this time.
                    </Text>
                  </View>
                );
              }
              if (isEligible) {
                return (
                  <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colorsBase.palette.successLight, borderRadius: 12, borderWidth: 1, borderColor: colorsBase.palette.success + '40' }}>
                    <Text style={{ ...typography.bodySmall, color: colorsBase.palette.successDark, lineHeight: 22, fontWeight: '500' }}>
                      You are healthy and eligible to donate blood.
                    </Text>
                  </View>
                );
              }
              if (isUnknown) return null;
              return null;
            })()}
            
            {/* Show confidence if available and eligible (prefer eligibilityConfidencePercent from API) */}
            {(donorProfile.eligibilityStatus === 'ELIGIBLE' || donorProfile.eligibilityStatus === 'eligible') && (donorProfile.eligibilityConfidencePercent != null || donorProfile.eligibilityConfidence != null) && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Confidence:</Text>
                <Text style={[styles.statusText, { textAlign: 'right' }]}>
                  {(donorProfile.eligibilityConfidencePercent != null ? donorProfile.eligibilityConfidencePercent : (donorProfile.eligibilityConfidence ?? 0) * 100).toFixed(1)}%
                </Text>
              </View>
            )}
            
            {/* Checked At - Always show with placeholder */}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Checked At:</Text>
              <Text style={[styles.statusText, { textAlign: 'right' }]}>
                {donorProfile.eligibilityCheckedAt 
                  ? new Date(donorProfile.eligibilityCheckedAt).toLocaleDateString() 
                  : '—'}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Access moved to subtle action cards above */}

        {/* Donation History - Simplified */}
        {hasDonorRecord && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Donation History</Text>
            <View style={styles.requirementsCard}>
              {loadingHistory && (
                <View style={styles.requirementItem}>
                  <IconSymbol name="clock" size={20} color={semanticColors.textSecondary} />
                  <Text style={styles.requirementText}>Loading...</Text>
                </View>
              )}
              {!loadingHistory && historyError && (
                <View style={styles.requirementItem}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color={semanticColors.interactiveDanger} />
                  <Text style={styles.requirementText}>{historyError}</Text>
                </View>
              )}
              {!loadingHistory && !historyError && history.length === 0 && (
                <View style={styles.requirementItem}>
                  <IconSymbol name="clock" size={20} color={semanticColors.textSecondary} />
                  <Text style={styles.requirementText}>No donation records yet</Text>
                </View>
              )}
              {!loadingHistory && !historyError && history.map((h, i) => {
                const dt = new Date(h.donationDate).toLocaleDateString();
                const vol = h.volumeMl ? `${h.volumeMl}ml` : '';
                return (
                  <View key={i} style={styles.requirementItem}>
                    <IconSymbol name="heart.fill" size={20} color={semanticColors.interactivePrimary} />
                    <Text style={styles.requirementText}>{dt}{vol ? ` · ${vol}` : ''}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semanticColors.bgAlt,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingBottom: spacing.xxl,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100,
  },
  headerBannerWrap: {
    alignSelf: 'center',
    width: '92%',
    marginBottom: spacing.md,
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
  },
  headerSubtitle: { 
    color: semanticColors.textInverse, 
    ...typography.bodySmall,
    marginTop: spacing.xs / 2, 
    opacity: 0.95,
    fontWeight: '500',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colorsBase.palette.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: semanticColors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: semanticColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: semanticColors.bgSurface,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
    ...elevation.none,
    gap: spacing.sm,
  },
  actionLabel: {
    ...typography.bodySmall,
    color: semanticColors.textPrimary,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: semanticColors.bgSurface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    ...elevation.none,
  },
  statusTitle: { 
    ...typography.h4,
    fontWeight: '700', 
    color: semanticColors.textPrimary, 
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  statusValue: { 
    ...typography.body,
    fontWeight: '600', 
    color: semanticColors.textPrimary, 
    marginBottom: spacing.md,
    fontSize: 18,
  },
  statusRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 24,
    width: '100%',
  },
  statusLabel: { 
    ...typography.label,
    color: semanticColors.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
    marginRight: spacing.md,
    minWidth: 120,
  },
  statusText: { 
    ...typography.bodySmall,
    color: semanticColors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
    minWidth: 0,
    flexShrink: 1,
  },
  
  section: {
    marginBottom: spacing.xxl,
    marginHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: semanticColors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: semanticColors.bgSurface,
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: semanticColors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: semanticColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  requirementsCard: {
    backgroundColor: semanticColors.bgSurface,
    borderRadius: 20,
    padding: spacing.lg,
    ...elevation.none,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  requirementText: {
    ...typography.bodySmall,
    color: semanticColors.textPrimary,
    marginLeft: spacing.md,
    flex: 1,
    fontWeight: '500',
  },
  processSteps: {
    backgroundColor: semanticColors.bgSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semanticColors.interactivePrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: semanticColors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: semanticColors.textPrimary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: semanticColors.textSecondary,
  },
  ctaSection: {
    backgroundColor: semanticColors.bgSurface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: semanticColors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 16,
    color: semanticColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: colorsBase.palette.info,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: semanticColors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  ineligibleHeading: { fontSize: 14, fontWeight: '700', color: semanticColors.interactiveDanger, marginBottom: 4 },
  ineligibleText: { fontSize: 14, color: semanticColors.interactiveDanger, marginBottom: 6 },
  ineligibleHint: { fontSize: 12, color: semanticColors.textSecondary },
});
