import React, { useCallback, useState } from "react";
import { Stack, router } from "expo-router";
import { ScrollView, StyleSheet, View, Text, Platform, TouchableOpacity, Dimensions } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, commonStyles } from "@/styles/commonStyles";
import { api, getBaseUrl } from "@/service/api";
import { colors as theme, spacing as themeSpacing, radii as themeRadii } from "@/constants/theme";
// Connectivity diagnostics removed per request

// Lazy-load LinearGradient like in Notifications to keep consistent header rendering
let LinearGradient: any;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch { LinearGradient = View; }

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
        {/* Header (match Notification header style) */}
        <LinearGradient
          colors={[theme.primary, '#C40F45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="heart.fill" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Welcome Back!</Text>
                <Text style={styles.headerSubtitle}>Save lives, donate blood</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCardNew}>
              <View style={[styles.statIconWrap, { backgroundColor: `${s.color}15` }]}>
                <IconSymbol name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={styles.statValueNew}>{s.value}</Text>
              <Text style={styles.statLabelNew}>{s.title}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleNew}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/createRequest')}>
              <View style={styles.actionIcon}>
                <IconSymbol name="doc.text" size={18} color={colors.text} />
              </View>
              <Text style={styles.actionLabel}>Request Blood</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/emergencyRequest')}>
              <View style={styles.actionIcon}>
                <IconSymbol name="phone.fill" size={18} color={colors.text} />
              </View>
              <Text style={styles.actionLabel}>Emergency</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Diagnostics (safe) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleNew}>Diagnostics</Text>
          <View style={styles.connectCardNew}>
            <Text style={styles.connectTitle}>Backend Health</Text>
            <Text style={styles.connectSub}>API Base: {getBaseUrl()}</Text>
            <View style={styles.connectButtons}>
              <TouchableOpacity
                onPress={onCheckHealth}
                disabled={diagLoading}
                style={[styles.connectBtn, { backgroundColor: diagLoading ? '#9CA3AF' : theme.info }]}
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
              <Text style={styles.bannerCtaTxt}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: themeSpacing.xl,
    paddingVertical: themeSpacing.lg,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  headerGradient: {
    paddingHorizontal: themeSpacing.xl,
    paddingTop: themeSpacing.lg,
    paddingBottom: themeSpacing.xl,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: themeSpacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#FFE9EF',
    fontSize: 13,
    fontWeight: '500',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: themeSpacing.lg,
  },
  statCardNew: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: themeRadii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: themeSpacing.md,
    paddingHorizontal: themeSpacing.md,
    alignItems: 'flex-start',
    marginHorizontal: 4,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValueNew: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  statLabelNew: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: themeRadii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: themeSpacing.lg,
    marginBottom: themeSpacing.lg,
  },
  sectionTitleNew: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: themeSpacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: themeSpacing.md,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: themeRadii.md,
    paddingVertical: themeSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
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
    width: 34,
    height: 34,
    borderRadius: 10,
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
    borderRadius: themeRadii.lg,
    padding: themeSpacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  bannerSub: { fontSize: 13, color: colors.textSecondary },
  bannerCta: {
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  bannerCtaTxt: { color: '#fff', fontWeight: '800' },
  connectCardNew: {
    backgroundColor: colors.card,
    borderRadius: themeRadii.lg,
    padding: themeSpacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
