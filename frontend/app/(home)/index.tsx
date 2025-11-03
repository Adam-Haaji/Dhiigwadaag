import React, { useCallback, useState } from "react";
import { Stack, router } from "expo-router";
import { ScrollView, StyleSheet, View, Text, Platform, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, commonStyles } from "@/styles/commonStyles";
import { api, getBaseUrl } from "@/service/api";
// Connectivity diagnostics removed per request

export default function index() {
  // Diagnostics state removed
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  const onCheckHealth = useCallback(async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await api.health();
      setDiagResult(res);
    } catch (e: any) {
      setDiagError(e?.message || String(e));
      setDiagResult(null);
    } finally {
      setDiagLoading(false);
    }
  }, []);

  // Connectivity diagnostics handlers removed
  const stats = [
    { title: "Total Donors", value: "1,234", icon: "person.3.fill", color: colors.primary },
    { title: "Requests", value: "56", icon: "plus.circle.fill", color: colors.secondary },
    { title: "Lives Saved", value: "892", icon: "heart.fill", color: colors.success },
  ];

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

  return (
    <SafeAreaView style={styles.container}>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.welcomeSubtext}>Ready to save lives today?</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <View style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                  <IconSymbol name={stat.icon as any} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.statText}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/donorRegistration')}
            >
              <IconSymbol name="drop.fill" size={32} color={colors.primary} />
              <Text style={styles.actionText}>Register as Donor</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/createRequest')}
            >
              <IconSymbol name="plus.circle.fill" size={32} color={colors.secondary} />
              <Text style={styles.actionText}>Request Blood</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(home)/searchDonor')}
            >
              <IconSymbol name="magnifyingglass" size={32} color={colors.accent} />
              <Text style={styles.actionText}>Search Donors</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Diagnostics (safe) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostics</Text>
          <View style={styles.connectCard}>
            <Text style={styles.connectTitle}>Backend Health</Text>
            <Text style={styles.connectSub}>API Base: {getBaseUrl()}</Text>
            <View style={styles.connectButtons}>
              <TouchableOpacity
                onPress={onCheckHealth}
                disabled={diagLoading}
                style={[styles.connectBtn, { backgroundColor: diagLoading ? '#9CA3AF' : '#2563EB' }]}
              >
                <Text style={styles.connectBtnTxt}>{diagLoading ? 'Checking…' : 'Check Health'}</Text>
              </TouchableOpacity>
            </View>
            {diagError && (
              <View style={[styles.resultBox, { backgroundColor: '#DC2626' }]}> 
                <Text style={styles.resultHdr}>Error</Text>
                <Text style={styles.resultTxt}>{diagError}</Text>
              </View>
            )}
            {diagResult && (
              <View style={[styles.resultBox, { backgroundColor: '#065F46' }]}> 
                <Text style={styles.resultHdr}>/api/health</Text>
                <Text style={styles.resultTxtMono}>{JSON.stringify(diagResult)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Donor Registration Banner */}
        <View style={styles.section}>
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
              <Text style={styles.bannerCtaTxt}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Blood Donation Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Donation Tips</Text>
          {bloodTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <IconSymbol name={tip.icon as any} size={20} color={colors.primary} />
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
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    flexBasis: '48%',
    marginBottom: 12,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bannerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  bannerSub: { fontSize: 13, color: colors.textSecondary },
  bannerCta: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  bannerCtaTxt: { color: '#fff', fontWeight: '800' },
  emergencyBanner: {
    backgroundColor: colors.warning,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  emergencyButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emergencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  connectCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  connectTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  connectSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  connectButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  connectBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  connectBtnTxt: { color: '#fff', fontWeight: '700' },
  resultBox: { borderRadius: 8, padding: 10 },
  resultHdr: { color: '#fff', fontWeight: '800', marginBottom: 4 },
  resultTxt: { color: '#fff' },
  resultTxtMono: { color: '#ECEFF1', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 12 },
});
