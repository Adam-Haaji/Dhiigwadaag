import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import { colors } from '@/styles/commonStyles';

export default function DonorDashboard() {
  const { user } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();
  const donorStatus = String(user?.user?.donorStatus || 'not_a_donor');
  const unavailableUntil = user?.user?.unavailableUntil ? new Date(user.user.unavailableUntil) : null;
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // TODO: fetch donation history endpoint when available
    setHistory([]);
  }, []);

  const badge = useMemo(() => {
    if (donorStatus === 'unavailable' && unavailableUntil) {
      return `Unavailable until ${unavailableUntil.toLocaleDateString()}`;
    }
    if (donorStatus === 'available') return 'Available';
    return 'Not a donor';
  }, [donorStatus, unavailableUntil]);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Donor Dashboard</Text>
        <View style={s.card}>
          <Text style={s.label}>My Status</Text>
          <Text style={[s.value, donorStatus === 'unavailable' && { color: colors.error }]}>{badge}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.label}>Last Donation</Text>
          <Text style={s.value}>{user?.user?.lastDonationDate ? new Date(user.user.lastDonationDate).toLocaleDateString() : '—'}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.label}>Next Eligibility Date</Text>
          <Text style={s.value}>{unavailableUntil ? unavailableUntil.toLocaleDateString() : '—'}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.label}>Donation History</Text>
          {history.length === 0 ? <Text style={s.muted}>No donations recorded yet.</Text> : history.map((h, i) => (
            <Text key={i} style={s.value}>{h.date} · {h.volume}ml</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  value: { marginTop: 6, fontWeight: '700', color: colors.text },
  muted: { marginTop: 6, color: colors.textSecondary }
});
