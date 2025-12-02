import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import { router } from 'expo-router';
import HeroCard from '@/components/HeroCard';

export default function DonorDashboard() {
  const { user, setUser } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();
  const donorStatus = String(user?.user?.donorStatus || 'not_a_donor');
  const unavailableUntil = user?.user?.unavailableUntil ? new Date(user.user.unavailableUntil) : null;
  const lastDonationDate = user?.user?.lastDonationDate ? new Date(user.user.lastDonationDate) : null;
  const bloodType = user?.user?.bloodType || '-';
  const [matches, setMatches] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  const lastTopMatchIdRef = useRef<string | null>(null);

  async function loadMatches(showToastOnNew = false) {
    try {
      const m = await api.listMyMatches();
      if (Array.isArray(m)) {
        setMatches(m);
        if (showToastOnNew && m.length) {
          const topId = String(m[0]._id);
          if (lastTopMatchIdRef.current && lastTopMatchIdRef.current !== topId) {
            setToast({ id: topId, text: 'New match available' });
            // auto-hide after 4s
            setTimeout(() => setToast(null), 4000);
          }
          lastTopMatchIdRef.current = topId;
        } else if (m.length && !lastTopMatchIdRef.current) {
          lastTopMatchIdRef.current = String(m[0]._id);
        }
      }
    } catch {}
  }

  async function loadNotes() {
    try {
      const n = await api.myNotifications();
      const filtered = Array.isArray(n) ? n.filter((x: any) => {
        const t = (x?.type || '').toString().toLowerCase();
        return t.includes('request') || t.includes('donation') || t === '';
      }) : [];
      setNotes(filtered);
    } catch {}
  }

  useEffect(() => {
    (async () => {
      await loadMatches(false);
      await loadNotes();
    })();
    // quick refresh poll for matches
    const timer = setInterval(() => {
      loadMatches(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const statusText = useMemo(() => {
    if (donorStatus === 'unavailable' && unavailableUntil) return `Unavailable until ${unavailableUntil.toLocaleDateString()}`;
    if (donorStatus === 'available') return 'Available';
    return 'Not a donor';
  }, [donorStatus, unavailableUntil]);

  return (
    <SafeAreaView style={s.container}>
      {!!toast && (
        <View style={s.toast}>
          <Text style={s.toastText}>{toast.text}</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/matchedRequestDetail', params: { id: toast.id } })}>
            <Text style={s.toastCta}>View</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero (top rectangle styled like image 1) */}
        <HeroCard
          title="Become a Donor"
          subtitle="Join thousands of heroes"
          ctas={[
            {
              icon: 'heart.fill',
              bg: '#2B79F7',
              onPress: () => router.push('/compatibleRecipients'),
            },
            {
              icon: 'person.2.fill',
              bg: '#F59E0B',
              onPress: () => router.push('/donorMatches'),
            },
          ]}
        />

        {/* Role switch action */}
        <View style={s.topActionsRow}>
          <Pressable
            onPress={async () => {
              try {
                const updated = await api.switchRole('requester');
                const token = user?.token;
                await setUser({ token, user: updated });
                router.replace('/requesterDashboard');
              } catch {}
            }}
            style={({ pressed }) => [s.switchPill, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Text style={s.switchPillText}>⇄ Switch to Request</Text>
          </Pressable>
        </View>

        {/* Status Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Donor Status</Text>
          <View style={s.rowBetween}>
            <View style={s.badge}><Text style={s.badgeText}>Blood: {bloodType}</Text></View>
            <View style={[s.badge, donorStatus === 'available' ? s.badgeOk : donorStatus === 'unavailable' ? s.badgeWarn : s.badgeMuted]}>
              <Text style={s.badgeText}>{statusText}</Text>
            </View>
          </View>
          <View style={s.metaRow}><Text style={s.metaKey}>Last Donation</Text><Text style={s.metaVal}>{lastDonationDate ? lastDonationDate.toLocaleDateString() : '—'}</Text></View>
          <View style={s.metaRow}><Text style={s.metaKey}>Next Eligibility</Text><Text style={s.metaVal}>{unavailableUntil ? unavailableUntil.toLocaleDateString() : '—'}</Text></View>
        </View>

        {/* Matched Requests */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Matched Requests</Text>
          {matches?.length ? matches.slice(0, 5).map((r: any) => (
            <Pressable style={s.listItem} key={String(r._id)} onPress={() => router.push({ pathname: '/matchedRequestDetail', params: { id: String(r._id) } })}>
              <Text style={s.itemTitle}>{r.patientName || r.bloodType || 'Blood Request'}</Text>
              <Text style={s.itemMeta}>{(r.urgency || r.status || '').toString()}</Text>
            </Pressable>
          )) : <Text style={s.empty}>No matches yet.</Text>}
        </View>

        {/* Notifications */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Notifications</Text>
          {notes?.length ? notes.slice(0, 5).map((n: any, i: number) => (
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
  toast: { position: 'absolute', top: 10, left: 16, right: 16, zIndex: 10, backgroundColor: '#111827', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toastText: { color: '#FFFFFF', fontWeight: '700' },
  toastCta: { color: '#60A5FA', fontWeight: '800' },
  topActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginTop: 8 },
  switchPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#DADDE1' },
  switchPillText: { color: '#111827', fontWeight: '700' },
  card: { alignSelf: 'center', width: '92%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: '#EEF2FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  badgeOk: { backgroundColor: '#E7F6EC' },
  badgeWarn: { backgroundColor: '#FFF4E5' },
  badgeMuted: { backgroundColor: '#EAEAEA' },
  badgeText: { color: '#111827', fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaKey: { color: '#6B7280' },
  metaVal: { color: '#111827', fontWeight: '700' },
  listItem: { borderTopWidth: 1, borderTopColor: '#EEF2F7', paddingVertical: 10 },
  itemTitle: { color: '#111827', fontWeight: '600' },
  itemMeta: { color: '#6B7280', marginTop: 2 },
  empty: { color: '#6B7280' },
  profileBtn: { alignSelf: 'center', marginTop: 16, backgroundColor: '#2B79F7', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  profileBtnText: { color: '#fff', fontWeight: '700' }
});
