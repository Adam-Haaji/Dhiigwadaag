import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function DonorRequestList() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const uid = user?.user?._id || user?.user?.id;
      if (!uid) return;
      const res = await api.get(`/api/request/matches/${uid}`);
      setItems(res.data.requests || []);
    })();
  }, [user]);

  const renderItem = ({ item }: any) => (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <Text style={s.title}>Patient: {item.patientName || 'Unknown'}</Text>
        <View style={s.tierBadge}><Text style={s.tierTxt}>{item.matchedTier || '—'}</Text></View>
      </View>
      <View style={s.rowBetween}>
        <View style={s.badge}><Text style={s.badgeTxt}>Type: {item.patientType}</Text></View>
        <View style={s.badge}><Text style={s.badgeTxt}>District: {item.district || 'N/A'}</Text></View>
      </View>
      <Text style={s.note}>Tier Used: {(item.tierUsed || []).join(', ')}</Text>
      <View style={[s.statusBadge, item.status === 'pending' ? s.waiting : item.status === 'matched' ? s.matched : s.fulfilled]}>
        <Text style={s.statusTxt}>{item.status === 'pending' ? 'Waiting' : item.status === 'matched' ? 'Matched' : item.status === 'accepted' ? 'Accepted' : item.status === 'fulfilled' ? 'Fulfilled' : String(item.status)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList data={items} keyExtractor={(i) => i._id} renderItem={renderItem} contentContainerStyle={s.listContent} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontWeight: '800', color: colors.text },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.primary, marginTop: 4 },
  badgeTxt: { color: '#fff', fontSize: 12 },
  tierBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#4527A0' },
  tierTxt: { color: '#fff', fontWeight: '700' },
  note: { color: colors.textSecondary, marginTop: 6 },
  statusBadge: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  statusTxt: { color: '#fff', fontWeight: '700' },
  waiting: { backgroundColor: '#6C757D' },
  matched: { backgroundColor: '#4527A0' },
  fulfilled: { backgroundColor: '#2E7D32' },
});
