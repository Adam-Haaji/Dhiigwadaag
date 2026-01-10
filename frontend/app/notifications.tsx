import React, { useEffect, useState, useMemo } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';

type Noti = {
  id: string;
  _id?: string;
  type: 'donor'|'request'|'match'|'system'|'emergency';
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
  const { isDark } = useTheme();
  const [loadError, setLoadError] = useState<string | null>(null);
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    list: { padding: 16 },
    card: { backgroundColor: semanticColors.bgSurface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle, marginBottom: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: semanticColors.textPrimary, fontWeight: '800' },
    msg: { color: semanticColors.textSecondary, marginTop: 6 },
    time: { color: semanticColors.textSecondary, marginTop: 6, fontSize: 12 },
    roleTag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
    tagTxt: { color: semanticColors.textInverse, fontWeight: '700' },
    tagDonor: { backgroundColor: semanticColors.interactivePrimary },
    tagReq: { backgroundColor: semanticColors.interactiveDanger },
    tagMatch: { backgroundColor: semanticColors.interactivePrimaryActive },
  }), [isDark]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadError(null);
        const res = await api.myNotifications();
        const list: any[] = Array.isArray(res?.notifications) ? res.notifications as any[] : (Array.isArray(res) ? (res as any[]) : []);
        const normalized: Noti[] = list.map((n: any) => {
          const requestId = n.requestId || n.meta?.requestId || n.data?.requestId || n.data?.meta?.requestId || n.request?._id || n.request?.id || n.request || undefined;
          const donorId = n.donorId || n.meta?.donorId || n.data?.donorId || n.data?.meta?.donorId || n.donor?._id || n.donor?.id || n.donor || undefined;
          const type = (n.type || (n.category ?? '') || '').toString().toLowerCase();
          return {
            id: n.id || n._id || String(Math.random()),
            // Backend uses: request/emergency/system. Keep these so filtering/navigation can work.
            type: (type === 'donor' || type === 'request' || type === 'match' || type === 'system' || type === 'emergency')
              ? (type as Noti['type'])
              : 'system',
            title: n.title || 'Notification',
            message: n.body || n.message || '',
            timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
            data: n.data || { requestId, donorId },
            requestId,
            donorId,
          } as Noti;
        });
        // Role visibility:
        // - Donor/both/admin: show everything (backend uses type=request for donor match notifications)
        // - Requester: also show everything; navigation decides the best screen.
        const role = user?.user?.role?.toLowerCase();
        const filtered = role === 'donor' || role === 'both' || role === 'admin'
          ? normalized
          : normalized;
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (alive) setItems(filtered);
      } catch (e: any) {
        if (alive) {
          setLoadError(e?.message || 'Failed to load notifications');
          setItems([]);
        }
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const openDetails = (n: Noti) => {
    const role = user?.user?.role?.toLowerCase();

    const title = String(n.title || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    const looksDonorTarget = title.includes('you are matched') || msg.includes('matched to donate') || msg.includes('you are matched');

    // Donor-style notifications should land on the donor workflow screen even when role is `both`.
    const isDonorNoti = looksDonorTarget || role === 'donor';
    if (isDonorNoti || (role === 'both' || role === 'admin')) {
      if (!n.requestId) {
        Alert.alert('Missing request', 'This notification has no request id.');
        return;
      }
      router.push({ pathname: '/matchedRequestDetail', params: { id: String(n.requestId), mode: 'donor' } });
      return;
    }

    // Requesters keep using the notification detail screen.
    const params: Record<string, string> = { payload: JSON.stringify(n) };
    if (role === 'requester') params.mode = 'requester';
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
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {loadError ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ color: semanticColors.interactiveDanger, fontWeight: '700' }}>{loadError}</Text>
        </View>
      ) : null}
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={s.list} />
    </SafeAreaView>
  );
}

export default NotificationsScreen;
export { NotificationsScreen };
