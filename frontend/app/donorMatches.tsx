import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import { router } from 'expo-router';

export default function DonorMatches() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listMyMatches();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={s.header}>Matched Requests</Text>
        {items.length === 0 && (
          <View style={s.emptyBox}>
            <IconSymbol name="bell" size={20} color={colors.textSecondary} />
            <Text style={s.emptyTxt}>No matches yet. We’ll notify you when matched.</Text>
          </View>
        )}
        {items.map((it) => (
          <TouchableOpacity key={String(it._id)} style={s.card} onPress={() => router.push({ pathname: '/matchedRequestDetail', params: { id: String(it._id) } })}>
            <View style={s.rowBetween}>
              <View style={s.rowCenter}>
                <View style={s.btBadge}><Text style={s.btTxt}>{String(it.bloodType).toUpperCase()}</Text></View>
                <Text style={s.title}>Blood Request</Text>
              </View>
              {it.matchedTier && <Text style={s.tier}>{it.matchedTier}</Text>}
            </View>
            <Text style={s.meta}>Location: {it.location || '—'}</Text>
            <Text style={s.meta}>Status: {it.status}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  header: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
  emptyBox: { backgroundColor: colors.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyTxt: { marginTop: 8, color: colors.textSecondary },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  btBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 10 },
  btTxt: { color: '#fff', fontWeight: '800' },
  title: { fontWeight: '700', color: colors.text },
  tier: { color: colors.accent, fontWeight: '700' },
  meta: { color: colors.textSecondary, marginTop: 4 },
});
