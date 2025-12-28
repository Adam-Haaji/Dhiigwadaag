
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';

export default function DonorDashboard() {
  const { user, setUser } = useAuth();
  const [switching, setSwitching] = useState(false);
  const role = String(user?.user?.role || '').toLowerCase();
  const donorStatus = String(user?.user?.donorStatus || 'not_a_donor');
  const unavailableUntil = user?.user?.unavailableUntil ? new Date(user.user.unavailableUntil) : null;
  const lastDonationDate = user?.user?.lastDonationDate ? new Date(user.user.lastDonationDate) : null;
  const ineligibilityReason = user?.user?.ineligibilityReason || null;
  const [history, setHistory] = useState<{ donationDate: string; volumeMl?: number; screeningClear?: boolean }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!(role === 'donor' || role === 'both' || role === 'admin')) {
      router.replace('/role');
    }
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!(role === 'donor' || role === 'both' || role === 'admin')) return;
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
  }, [role]);

  const statusBadge = useMemo(() => {
    if (donorStatus === 'unavailable' && unavailableUntil) return `Unavailable until ${unavailableUntil.toLocaleDateString()}`;
    if (donorStatus === 'available') return 'Available';
    return 'Not a donor';
  }, [donorStatus, unavailableUntil]);

  const handleRegister = () => router.push('/donorRegistration');
  const handleViewMatches = async () => {
    try {
      const matches: any[] = await api.listMyMatches();
      if (Array.isArray(matches) && matches.length > 0) {
        const topId = String(matches[0]._id);
        router.push({ pathname: '/matchedRequestDetail', params: { id: topId, mode: 'donor' } });
        return;
      }
    } catch {}
    router.push({ pathname: '/(home)/notification', params: { openLatestRequest: '1' } });
  };
  const handleSwitchToRequester = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      const updated = await api.switchRole('requester');
      const token = user?.token;
      await setUser({ token, user: updated });
      router.replace('/(home)/request');
    } catch {}
    setSwitching(false);
  };

  const features = [
    {
      title: "Health Check",
      description: "Complete health screening before donation",
      icon: "heart.text.square.fill",
      color: colors.success,
    },
    {
      title: "Safe Process",
      description: "Sterile equipment and professional staff",
      icon: "shield.checkered",
      color: colors.secondary,
    },
    {
      title: "Quick & Easy",
      description: "Donation process takes only 10-15 minutes",
      icon: "clock.fill",
      color: colors.accent,
    },
    {
      title: "Track Impact",
      description: "See how your donations help save lives",
      icon: "chart.line.uptrend.xyaxis",
      color: colors.primary,
    },
  ];

  const requirements = [
    "Age: 18-65 years old",
    "Weight: Minimum 50kg (110 lbs)",
    "Good general health",
    "No recent illness or medication",
    "Valid ID required",
  ];

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Become a Donor",
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section - match Notification header border style */}
        <View style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="drop.fill" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Become a Donor</Text>
                <Text style={styles.headerSubtitle}>Join thousands of heroes</Text>
              </View>
            </View>
          </View>
        </View>

        {donorStatus === 'not_a_donor' && (
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <IconSymbol name="person.badge.plus" size={24} color="#FFFFFF" />
            <Text style={styles.registerButtonText}>Register as Donor</Text>
          </TouchableOpacity>
        )}

        {/* Switch Role */}
        <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchToRequester} disabled={switching}>
          <IconSymbol name="arrow.right.arrow.left.circle.fill" size={20} color="#FFFFFF" />
          <Text style={styles.switchBtnText}>{switching ? 'Switching...' : 'Switch to Requester'}</Text>
        </TouchableOpacity>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>My Status</Text>
          <Text style={[styles.statusValue, donorStatus === 'unavailable' && { color: colors.error }]}>{statusBadge}</Text>
          <View style={styles.statusRow}><Text style={styles.statusLabel}>Last Donation:</Text><Text style={styles.statusText}>{lastDonationDate ? lastDonationDate.toLocaleDateString() : '—'}</Text></View>
          <View style={styles.statusRow}><Text style={styles.statusLabel}>Next Eligibility:</Text><Text style={styles.statusText}>{unavailableUntil ? unavailableUntil.toLocaleDateString() : '—'}</Text></View>
          {donorStatus === 'ineligible' && ineligibilityReason && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.ineligibleHeading}>Ineligible Reason</Text>
              <Text style={styles.ineligibleText}>{ineligibilityReason}</Text>
              <Text style={styles.ineligibleHint}>Learn more about requirements to become eligible again.</Text>
            </View>
          )}
        </View>

        {/* Quick Access to Matched Requests */}
        <TouchableOpacity style={styles.matchesButton} onPress={handleViewMatches}>
          <IconSymbol name="bell" size={22} color="#FFFFFF" />
          <Text style={styles.matchesButtonText}>View Matched Requests</Text>
        </TouchableOpacity>

        {/* Donation History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donation History</Text>
          <View style={styles.requirementsCard}>
            {loadingHistory && (
              <View style={styles.requirementItem}>
                <IconSymbol name="clock" size={20} color={colors.textSecondary} />
                <Text style={styles.requirementText}>Loading history...</Text>
              </View>
            )}
            {!loadingHistory && historyError && (
              <View style={styles.requirementItem}>
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.error} />
                <Text style={styles.requirementText}>{historyError}</Text>
              </View>
            )}
            {!loadingHistory && !historyError && history.length === 0 && (
              <View style={styles.requirementItem}>
                <IconSymbol name="clock" size={20} color={colors.textSecondary} />
                <Text style={styles.requirementText}>No donation records yet.</Text>
              </View>
            )}
            {!loadingHistory && !historyError && history.map((h, i) => {
              const dt = new Date(h.donationDate).toLocaleDateString();
              const vol = h.volumeMl ? `${h.volumeMl}ml` : '—';
              const screening = h.screeningClear === true ? 'Cleared' : h.screeningClear === false ? 'Pending' : '';
              return (
                <View key={i} style={styles.requirementItem}>
                  <IconSymbol name="heart.fill" size={20} color={colors.primary} />
                  <Text style={styles.requirementText}>{dt} · {vol}{screening ? ` · ${screening}` : ''}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Features Section (education stays) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Donate Blood?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <IconSymbol name={feature.icon as any} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Requirements Section (education) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donation Requirements</Text>
          <View style={styles.requirementsCard}>
            {requirements.map((requirement, index) => (
              <View key={index} style={styles.requirementItem}>
                <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
                <Text style={styles.requirementText}>{requirement}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Process Steps (education) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donation Process</Text>
          <View style={styles.processSteps}>
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Registration</Text>
                <Text style={styles.stepDescription}>Complete your donor profile</Text>
              </View>
            </View>
            
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Health Screening</Text>
                <Text style={styles.stepDescription}>Quick health check and questionnaire</Text>
              </View>
            </View>
            
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Donation</Text>
                <Text style={styles.stepDescription}>Safe and comfortable donation process</Text>
              </View>
            </View>
            
            <View style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Recovery</Text>
                <Text style={styles.stepDescription}>Rest and refreshments provided</Text>
              </View>
            </View>
          </View>
        </View>

        {donorStatus === 'not_a_donor' && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Ready to Save Lives?</Text>
            <Text style={styles.ctaText}>
              Your donation can help up to 3 patients in need. Register today and become a hero.
            </Text>
            <TouchableOpacity style={styles.ctaButton} onPress={handleRegister}>
              <Text style={styles.ctaButtonText}>Start Registration</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: '#FFE9EF', fontSize: 13, fontWeight: '500', marginTop: 2 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  registerButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
    boxShadow: '0px 4px 12px rgba(231, 76, 60, 0.3)',
    elevation: 4,
  },
  switchBtn: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  statusTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  statusValue: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statusLabel: { fontSize: 14, color: colors.textSecondary },
  statusText: { fontSize: 14, color: colors.text },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  matchesButton: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
    boxShadow: '0px 4px 12px rgba(52, 152, 219, 0.25)',
    elevation: 3,
  },
  matchesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  requirementsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  processSteps: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  ctaSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ineligibleHeading: { fontSize: 14, fontWeight: '700', color: colors.error, marginBottom: 4 },
  ineligibleText: { fontSize: 14, color: colors.error, marginBottom: 6 },
  ineligibleHint: { fontSize: 12, color: colors.textSecondary },
});
