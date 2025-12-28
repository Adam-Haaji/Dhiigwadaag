import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';

type Noti = {
  id: string;
  _id?: string;
  type: 'donor'|'request'|'match';
  title: string;
  message: string;
  body?: string;
  timestamp: string;
  createdAt?: string;
  data?: any;
  requestId?: string;
  donorId?: string;
};

function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Noti[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api.myNotifications();
      const list: any[] = Array.isArray(res?.notifications) ? res.notifications as any[] : (Array.isArray(res) ? (res as any[]) : []);
      const normalized: Noti[] = list.map((n: any) => {
        const requestId = n.requestId || n.data?.requestId || n.request?._id || n.request?.id || n.request || undefined;
        const donorId = n.donorId || n.data?.donorId || n.donor?._id || n.donor?.id || n.donor || undefined;
        const type = (n.type || (n.category ?? '') || '').toString().toLowerCase();
        return {
          id: n.id || n._id || String(Math.random()),
          type: type === 'donor' || type === 'request' || type === 'match' ? (type as Noti['type']) : 'match',
          title: n.title || 'Notification',
          message: n.body || n.message || '',
          timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
          data: n.data || { requestId, donorId },
          requestId,
          donorId,
        } as Noti;
      });
      // Role visibility: filter if role present
      const role = user?.user?.role?.toLowerCase();
      const filtered = role === 'donor'
        ? normalized.filter(n => n.type === 'donor' || n.type === 'match')
        : role === 'requester'
          ? normalized.filter(n => n.type === 'request' || n.type === 'match')
          : normalized;
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (alive) setItems(filtered);
    })();
    return () => { alive = false; };
  }, [user]);

  const openDetails = (n: Noti) => {
    const role = user?.user?.role?.toLowerCase();
    const params: Record<string, string> = { payload: JSON.stringify(n) };
    if (role === 'donor') params.mode = 'donor';
    router.push({ pathname: '/match-details', params });
  };

  const renderItem = ({ item }: { item: Noti }) => (
    <TouchableOpacity style={s.card} onPress={() => openDetails(item)}>
      <View style={s.rowBetween}>
        <Text style={s.title}>{item.title}</Text>
        <View style={[s.roleTag, item.type === 'donor' ? s.tagDonor : item.type === 'request' ? s.tagReq : s.tagMatch]}>
          <Text style={s.tagTxt}>{item.type === 'donor' ? 'Donor' : item.type === 'request' ? 'Request' : 'Match'}</Text>
        </View>
      </View>
      <Text style={s.msg}>{item.message}</Text>
      <Text style={s.time}>{new Date(item.timestamp).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={s.list} />
    </SafeAreaView>
  );
}

export default NotificationsScreen;
export { NotificationsScreen };

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontWeight: '800' },
  msg: { color: colors.textSecondary, marginTop: 6 },
  time: { color: colors.textSecondary, marginTop: 6, fontSize: 12 },
  roleTag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  tagTxt: { color: '#fff', fontWeight: '700' },
  tagDonor: { backgroundColor: colors.primary },
  tagReq: { backgroundColor: '#E53935' },
  tagMatch: { backgroundColor: '#4527A0' },
});
