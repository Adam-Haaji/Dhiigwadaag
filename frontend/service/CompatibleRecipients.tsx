import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import { colors } from '@/styles/commonStyles';

export default function CompatibleRecipients() {
  const { user } = useAuth();
  const myType = String(user?.user?.bloodType || '').toUpperCase();
  const [exact, setExact] = useState<any[]>([]);
  const [compat, setCompat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!myType) return;
    setLoading(true);
    try {
      const res = await (api as any).matchRecipients({ type: myType });
      setExact(res?.exactRecipients || []);
      setCompat(res?.compatibleRecipients || []);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const Item = ({ it, badge }: { it: any; badge: 'Perfect'|'Compatible' }) => (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <View style={s.rowCenter}>
          <View style={s.btBadge}><Text style={s.btTxt}>{String(it.bloodType).toUpperCase()}</Text></View>
          <Text style={s.title}>Recipient Request</Text>
        </View>
        <Text style={badge === 'Perfect' ? s.perfect : s.compat}>{String(it.bloodType).toUpperCase() === 'AB+' ? 'Universal Recipient' : (badge === 'Perfect' ? 'Perfect Match' : 'Compatible')}</Text>
      </View>
      <Text style={s.meta}>Location: {it.location || '—'}</Text>
      {typeof it.distanceKm === 'number' ? <Text style={s.meta}>Distance: {it.distanceKm} km</Text> : null}
      <Text style={s.meta}>Status: {it.status}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={s.header}>Recipients For {myType} {myType === 'O-' ? '• Universal Donor' : ''}</Text>
        <Text style={s.sectionTitle}>Exact Matches <Text style={s.badgePerfect}>Perfect Match</Text></Text>
        {exact.length === 0 ? <Text style={s.empty}>No exact recipients.</Text> : exact.map((it, i) => <Item it={it} badge="Perfect" key={String(it.id || i)} />)}
        <Text style={[s.sectionTitle, { marginTop: 12 }]}>Also Compatible</Text>
        {compat.length === 0 ? <Text style={s.empty}>No compatible recipients.</Text> : compat.map((it, i) => <Item it={it} badge="Compatible" key={String(it.id || i)} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  header: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  badgePerfect: { color: '#16A34A', fontWeight: '800' },
  empty: { color: colors.textSecondary, marginBottom: 12 },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  btBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 10 },
  btTxt: { color: '#fff', fontWeight: '800' },
  title: { fontWeight: '700', color: colors.text },
  perfect: { color: '#16A34A', fontWeight: '700' },
  compat: { color: '#F59E0B', fontWeight: '700' },
  meta: { color: colors.textSecondary, marginTop: 4 },
});
