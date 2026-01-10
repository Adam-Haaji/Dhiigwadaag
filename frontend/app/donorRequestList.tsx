import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function DonorRequestList() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [items, setItems] = useState<any[]>([]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    listContent: { padding: 16 },
    card: { backgroundColor: semanticColors.bgSurface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontWeight: '800', color: semanticColors.textPrimary },
    badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: semanticColors.interactivePrimary, marginTop: 4 },
    badgeTxt: { color: semanticColors.textInverse, fontSize: 12 },
    tierBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: semanticColors.interactivePrimaryActive },
    tierTxt: { color: semanticColors.textInverse, fontWeight: '700' },
    note: { color: semanticColors.textSecondary, marginTop: 6 },
    statusBadge: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
    statusTxt: { color: semanticColors.textInverse, fontWeight: '700' },
    waiting: { backgroundColor: semanticColors.borderStrong },
    matched: { backgroundColor: semanticColors.interactivePrimaryActive },
    fulfilled: { backgroundColor: '#2E7D32' },
  }), [isDark]);

  useEffect(() => {
    (async () => {
      const uid = user?.user?._id || user?.user?.id;
      if (!uid) return;
      const res = await api.get(`/api/request/matches/${uid}`);
      setItems(res.data.requests || []);
    })();
  }, [user]);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>Patient: {item.patientName || 'Unknown'}</Text>
        <View style={styles.tierBadge}><Text style={styles.tierTxt}>{item.matchedTier || '—'}</Text></View>
      </View>
      <View style={styles.rowBetween}>
        <View style={styles.badge}><Text style={styles.badgeTxt}>Type: {item.patientType}</Text></View>
        <View style={styles.badge}><Text style={styles.badgeTxt}>District: {item.district || 'N/A'}</Text></View>
      </View>
      <Text style={styles.note}>Tier Used: {(item.tierUsed || []).join(', ')}</Text>
      <View style={[styles.statusBadge, item.status === 'pending' ? styles.waiting : item.status === 'matched' ? styles.matched : styles.fulfilled]}>
        <Text style={styles.statusTxt}>{item.status === 'pending' ? 'Waiting' : item.status === 'matched' ? 'Matched' : item.status === 'accepted' ? 'Accepted' : item.status === 'fulfilled' ? 'Fulfilled' : String(item.status)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <FlatList data={items} keyExtractor={(i) => i._id} renderItem={renderItem} contentContainerStyle={styles.listContent} />
    </SafeAreaView>
  );
}

