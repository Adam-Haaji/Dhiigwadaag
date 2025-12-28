import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import { router } from 'expo-router';
import HeroCard from '@/components/HeroCard';

export default function RequesterDashboard() {
  const { user, setUser } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();
  const [active, setActive] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const list: any[] = await api.listRequests();
        const a = list.filter((r: any) => String(r.status).toLowerCase() !== 'fulfilled' && String(r.status).toLowerCase() !== 'cancelled');
        const p = list.filter((r: any) => String(r.status).toLowerCase() === 'fulfilled' || String(r.status).toLowerCase() === 'cancelled');
        setActive(a);
        setPast(p);
      } catch {}
      try {
        const n = await api.myNotifications();
        const filtered = Array.isArray(n) ? n.filter((x: any) => {
          const t = (x?.type || '').toString().toLowerCase();
          return t.includes('request') || t.includes('match') || t === '';
        }) : [];
        setNotes(filtered);
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero (top rectangle styled like image 1) */}
        <HeroCard
          title="Emergency Alert"
          subtitle="Critical situation — immediate action"
          ctas={[
            { icon: 'exclamationmark.triangle.fill', bg: '#EF4444', label: 'Search', onPress: () => router.push('/emergencyRequest') },
            { icon: 'phone.fill', bg: '#F59E0B', label: 'Emergency Call', onPress: () => router.push('/emergencyRequest') },
          ]}
        />

        {/* Role switch action */}
        <View style={s.topActionsRow}>
          <Pressable
            onPress={async () => {
              try {
                const updated = await api.switchRole('donor');
                const token = user?.token;
                await setUser({ token, user: updated });
                router.replace('/donorDashboard');
              } catch {}
            }}
            style={({ pressed }) => [s.switchPill, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Text style={s.switchPillText}>⇄ Switch to Donor</Text>
          </Pressable>
        </View>

        {/* Your Request Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Blood Requests</Text>
          {active.length ? active.slice(0,5).map((r, i) => (
            <View style={s.listItem} key={String(r._id || i)}>
              <Text style={s.itemTitle}>{r.patientName || r.bloodType}</Text>
              <Text style={s.itemMeta}>{r.urgency || r.status}</Text>
            </View>
          )) : <Text style={s.empty}>No active requests.</Text>}
        </View>

        {/* Matched Donors section removed per request */}

        {/* Notifications */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Notifications</Text>
          {notes?.length ? notes.slice(0,5).map((n: any, i: number) => (
            <View style={s.listItem} key={String(n._id || i)}>
              <Text style={s.itemTitle}>{n.title || n.message || 'Notification'}</Text>
              <Text style={s.itemMeta}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Text>
            </View>
          )) : <Text style={s.empty}>No notifications.</Text>}
        </View>

        <TouchableOpacity style={s.profileBtn} onPress={() => router.push('/(home)/profile')}>
          <Text style={s.profileBtnText}>Go to Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { paddingVertical: 16, paddingBottom: 40 },
  topActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginTop: 8 },
  switchPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#DADDE1' },
  switchPillText: { color: '#111827', fontWeight: '700' },
  card: { alignSelf: 'center', width: '92%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  listItem: { borderTopWidth: 1, borderTopColor: '#EEF2F7', paddingVertical: 10 },
  itemTitle: { color: '#111827', fontWeight: '600' },
  itemMeta: { color: '#6B7280', marginTop: 2 },
  empty: { color: '#6B7280' },
  profileBtn: { alignSelf: 'center', marginTop: 16, backgroundColor: '#2B79F7', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  profileBtnText: { color: '#fff', fontWeight: '700' }
});
