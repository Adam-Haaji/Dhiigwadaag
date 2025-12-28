
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';

export default function RequestScreen() {
  const { user, setUser } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();
  const [active, setActive] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  // Removed inline donors section/state per request
  const load = useCallback(async () => {
    if (!(role === 'requester' || role === 'both' || role === 'admin')) return;
    try {
      const list: any[] = await api.listRequests();
      const a = list.filter((r: any) => !['fulfilled','completed','cancelled','Fulfilled','Cancelled'].includes(String(r.status).toLowerCase()));
      const p = list.filter((r: any) => ['fulfilled','completed','cancelled','Fulfilled','Cancelled'].includes(String(r.status).toLowerCase()));
      setActive(a);
      setPast(p);
    } catch {}
  }, [role]);
  useEffect(() => {
    if (!(role === 'requester' || role === 'both' || role === 'admin')) {
      router.replace('/role');
    }
    load();
    return () => {};
  }, [role]);
  const handleCreateRequest = () => {
    router.push('/createRequest');
  };

  const handleEmergencyRequest = () => {
    router.push('/emergencyRequest');
  };

  // Donors auto-load logic removed; use Emergency Request screen for discovery

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const handleSwitchToDonor = async () => {
    try {
      const updated = await api.switchRole('donor');
      const token = user?.token;
      await setUser({ token, user: updated });
      router.replace('/(home)/donor');
    } catch {}
  };

  const recentRequests = [
    {
      id: 1,
      bloodType: 'O-',
      location: 'City Hospital',
      urgency: 'Critical',
      timeAgo: '2 hours ago',
      status: 'Active',
    },
    {
      id: 2,
      bloodType: 'A+',
      location: 'General Hospital',
      urgency: 'Urgent',
      timeAgo: '5 hours ago',
      status: 'Fulfilled',
    },
    {
      id: 3,
      bloodType: 'B-',
      location: 'Medical Center',
      urgency: 'Normal',
      timeAgo: '1 day ago',
      status: 'Active',
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return colors.error;
      case 'Urgent':
        return colors.warning;
      default:
        return colors.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? colors.success : colors.textSecondary;
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Blood Requests",
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
        {/* Header - match Notification style */}
        <View style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="clipboard" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Request Blood</Text>
                <Text style={styles.headerSubtitle}>Get help when you need it</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Switch Role */}
        <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchToDonor}>
          <Text style={styles.switchBtnText}>Switch to Donor</Text>
        </TouchableOpacity>

        {/* Dashboard Stats */}
        <View style={styles.dashboardCard}>
          <Text style={styles.dashboardTitle}>My Requests</Text>
          <View style={styles.dashboardRow}><Text style={styles.dashboardLabel}>Active:</Text><Text style={styles.dashboardValue}>{active.length}</Text></View>
          <View style={styles.dashboardRow}><Text style={styles.dashboardLabel}>Past:</Text><Text style={styles.dashboardValue}>{past.length}</Text></View>
        </View>

        {/* Create Request card */}
        <View style={styles.card}> 
          <View style={styles.cardRow}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.secondary}15` }]}>
              <IconSymbol name="doc.text" size={20} color={colors.secondary} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Create Request</Text>
              <Text style={styles.cardSubtitle}>Submit a regular blood request</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.secondary }]} onPress={handleCreateRequest}>
            <Text style={styles.primaryBtnText}>Create Request</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Request card */}
        <View style={[styles.card, styles.emergencyCard]}> 
          <View style={styles.cardRow}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.error}15` }]}>
              <IconSymbol name="phone.fill" size={20} color={colors.error} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Emergency Request</Text>
              <Text style={styles.cardSubtitle}>Urgent blood needed immediately</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.error }]} onPress={handleEmergencyRequest}>
            <Text style={styles.primaryBtnText}>Emergency Request</Text>
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

        {/* Guidelines */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Request Guidelines</Text>
          <View style={styles.tipRow}>
            <View style={styles.bullet} />
            <Text style={styles.tipText}>Provide accurate patient information</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.bullet} />
            <Text style={styles.tipText}>Specify blood type and quantity needed</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.bullet} />
            <Text style={styles.tipText}>Include hospital name and location</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.bullet} />
            <Text style={styles.tipText}>For emergencies, use the emergency request option</Text>
          </View>
        </View>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  dashboardCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  switchBtn: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  switchBtnText: { color: '#fff', fontWeight: '700' },
  dashboardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  dashboardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dashboardLabel: { color: colors.textSecondary },
  dashboardValue: { fontWeight: '700', color: colors.text },
  emergencyCard: {
    backgroundColor: '#FFF5F5',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSubtitle: { marginTop: 6, color: colors.textSecondary, fontSize: 13 },
  primaryBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
  listItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  listItemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  viewBtn: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: 12,
  },
  tipText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
});
