import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';
import api from '@/service/api';
import { router } from 'expo-router';

type Match = { _id: string; bloodType: string; requester?: { name?: string }; location?: string; urgency?: string; requestType?: 'emergency'|'normal'; expiresAt?: string; status?: string; timeLeft?: number | null };

export default function DonorMatches() {
  const [items, setItems] = useState<Match[]>([]);
  const { isDark } = useTheme();
  useEffect(() => { (async () => {
    try { const res = await api.listMyMatches(); setItems(Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : [])); } catch {}
  })(); }, []);

  const now = Date.now();
  const enriched = useMemo(() => items.map(i => ({
    ...i,
    timeLeft: i.expiresAt ? Math.max(0, new Date(i.expiresAt).getTime() - now) : null,
  })), [items, now]);
  const emergency = enriched.filter(i => String(i.requestType||'').toLowerCase() === 'emergency' && String(i.status||'').toLowerCase() !== 'expired');
  const normal = enriched.filter(i => (String(i.requestType||'').toLowerCase() !== 'emergency') && String(i.status||'').toLowerCase() !== 'expired');

  const openDetail = (m: Match) => router.push({ pathname: '/matchedRequestDetail', params: { id: m._id, mode: 'donor' } });

  const renderCard = (m: Match, isEmergency: boolean) => (
    <TouchableOpacity key={m._id} style={[s.card, isEmergency ? s.emergency : null]} onPress={() => openDetail(m)}>
      <View style={s.rowBetween}>
        <Text style={s.title}>{isEmergency ? 'Emergency Request' : 'Matched Request'}</Text>
        {isEmergency ? <View style={s.badgeCritical}><Text style={s.badgeTxt}>CRITICAL</Text></View> : null}
      </View>
      <Text style={s.line}>Blood Type: {m.bloodType || '—'}</Text>
      <Text style={s.line}>Requester: {m.requester?.name || 'Requester'}</Text>
      <Text style={s.line}>Location: {m.location || '—'}</Text>
      <Text style={s.line}>Urgency: {m.urgency || (isEmergency ? 'Critical' : 'Normal')}</Text>
      {m.timeLeft !== null && m.timeLeft !== undefined ? <Text style={s.line}>Time Left: {formatTime(m.timeLeft as number)}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionTitle}>🚨 Emergency Requests ({emergency.length})</Text>
        {emergency.map(m => renderCard(m, true))}
        <Text style={s.sectionTitle}>🩸 Normal Requests ({normal.length})</Text>
        {normal.map(m => renderCard(m, false))}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000); const h = Math.floor(m / 60); const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: semanticColors.bgAlt },
  content: { padding: 16 },
  sectionTitle: { color: semanticColors.textPrimary, fontWeight: '800', marginBottom: 8 },
  card: { backgroundColor: semanticColors.bgSurface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle, marginBottom: 12 },
  emergency: { borderColor: semanticColors.interactiveDanger, backgroundColor: semanticColors.bgSurface },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: semanticColors.textPrimary, fontWeight: '800' },
  line: { color: semanticColors.textSecondary, marginTop: 6 },
  badgeCritical: { backgroundColor: semanticColors.interactiveDanger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeTxt: { color: semanticColors.textInverse, fontWeight: '700' },
});
