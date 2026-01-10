import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

type Donor = { _id: string; fullName: string; phone?: string; district?: string; bloodGroup?: string; email?: string };

export default function EmergencyDonorsScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [items, setItems] = useState<Donor[]>([]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    list: { padding: 16 },
    card: { backgroundColor: semanticColors.bgSurface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle, marginBottom: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: semanticColors.textPrimary, fontWeight: '800' },
    line: { color: semanticColors.textSecondary, marginTop: 6 },
    badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: semanticColors.interactivePrimary },
    badgeTxt: { color: semanticColors.textInverse, fontWeight: '700' },
    btn: { paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    btnCall: { backgroundColor: '#2E7D32' },
    btnTxt: { color: semanticColors.textInverse, fontWeight: '800' },
  }), [isDark]);

  useEffect(() => {
    (async () => {
      try {
        // Auth required by backend route; user token is managed by api client
        const res = await api.emergencyDonors();
        const donors = Array.isArray(res?.donors) ? res.donors : (Array.isArray(res) ? res : []);
        setItems(donors);
      } catch {}
    })();
  }, [user]);

  const callDonor = (phone?: string) => { if (phone) Linking.openURL(`tel:${phone}`); };

  const renderItem = ({ item }: { item: Donor }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.fullName || 'Donor'}</Text>
        <View style={styles.badge}><Text style={styles.badgeTxt}>{item.bloodGroup || '—'}</Text></View>
      </View>
      <Text style={styles.line}>District: {item.district || '—'}</Text>
      {item.email ? <Text style={styles.line}>Email: {item.email}</Text> : null}
      {item.phone ? <Text style={styles.line}>Phone: {item.phone}</Text> : null}
      <TouchableOpacity style={[styles.btn, styles.btnCall]} onPress={() => callDonor(item.phone)}>
        <Text style={styles.btnTxt}>Call Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <FlatList data={items} keyExtractor={(i) => i._id} renderItem={renderItem} contentContainerStyle={styles.list} />
    </SafeAreaView>
  );
}

