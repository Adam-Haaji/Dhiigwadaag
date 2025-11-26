import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';

export default function RequesterDashboard() {
  const { user } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();
  const [active, setActive] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const list: any[] = await api.listRequests();
        const a = list.filter((r: any) => String(r.status).toLowerCase() !== 'fulfilled' && String(r.status).toLowerCase() !== 'cancelled');
        const p = list.filter((r: any) => String(r.status).toLowerCase() === 'fulfilled' || String(r.status).toLowerCase() === 'cancelled');
        setActive(a);
        setPast(p);
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Requester Dashboard</Text>
        <View style={s.card}>
          <Text style={s.label}>My Active Requests</Text>
          {active.length === 0 ? <Text style={s.muted}>No active requests.</Text> : active.map((r, i) => (
            <Text key={i} style={s.value}>{r.patientName || r.bloodType} · {r.status}</Text>
          ))}
        </View>
        <View style={s.card}>
          <Text style={s.label}>My Past Requests</Text>
          {past.length === 0 ? <Text style={s.muted}>No past requests.</Text> : past.map((r, i) => (
            <Text key={i} style={s.value}>{r.patientName || r.bloodType} · {r.status}</Text>
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
