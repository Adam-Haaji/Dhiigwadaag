import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

type Donor = { _id: string; fullName: string; phone?: string; district?: string; bloodGroup?: string; email?: string };

export default function EmergencyDonorsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Donor[]>([]);

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
    <View style={s.card}>
      <View style={s.rowBetween}>
        <Text style={s.title}>{item.fullName || 'Donor'}</Text>
        <View style={s.badge}><Text style={s.badgeTxt}>{item.bloodGroup || '—'}</Text></View>
      </View>
      <Text style={s.line}>District: {item.district || '—'}</Text>
      {item.email ? <Text style={s.line}>Email: {item.email}</Text> : null}
      {item.phone ? <Text style={s.line}>Phone: {item.phone}</Text> : null}
      <TouchableOpacity style={[s.btn, s.btnCall]} onPress={() => callDonor(item.phone)}>
        <Text style={s.btnTxt}>Call Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList data={items} keyExtractor={(i) => i._id} renderItem={renderItem} contentContainerStyle={s.list} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontWeight: '800' },
  line: { color: colors.textSecondary, marginTop: 6 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.primary },
  badgeTxt: { color: '#fff', fontWeight: '700' },
  btn: { paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnCall: { backgroundColor: '#2E7D32' },
  btnTxt: { color: '#fff', fontWeight: '800' },
});
