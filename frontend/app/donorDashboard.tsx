import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import { colors } from '@/styles/commonStyles';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';
import api from '@/service/api';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import HeroCard from '@/components/HeroCard';

export default function DonorDashboard() {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
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

  async function openLatestMatchOrNotification() {
    try {
      const m = await api.listMyMatches();
      if (Array.isArray(m) && m.length) {
        const topId = String(m[0]._id);
        router.push({ pathname: '/matchedRequestDetail', params: { id: topId, mode: 'donor' } });
        return;
      }
    } catch {}
    router.push({ pathname: '/(home)/notification', params: { openLatestRequest: '1' } });
  }

  /** Navigate to Matched Request Details when donor taps "You are matched" (same as View Matched Requests). */
  function onNotificationPress(n: any) {
    const title = String(n?.title || '').toLowerCase();
    const msg = String(n?.message || n?.body || '').toLowerCase();
    const isMatched = title.includes('you are matched') || msg.includes('you are matched') || msg.includes('matched to donate')
      || (n?.type || '').toString().toLowerCase() === 'match';
    const requestId = n?.requestId ?? n?.meta?.requestId ?? n?.meta?.matchId ?? n?.data?.requestId ?? n?.data?.matchId;
    const id = requestId != null ? String(requestId) : null;
    if (isMatched && id) {
      router.push({ pathname: '/matchedRequestDetail', params: { id, mode: 'donor' } });
      return;
    }
    if (isMatched && !id) {
      Alert.alert('Match details not found', 'This notification has no link to the request. Open "View Matched Requests" from the dashboard.');
      return;
    }
    router.push({ pathname: '/(home)/notification' });
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
    // Block access until donor registration is complete
    if (role === 'donor' && donorStatus === 'not_a_donor') {
      router.replace('/donorRegistration');
      return;
    }
    (async () => {
      await loadMatches(false);
      await loadNotes();
    })();
    const timer = setInterval(() => { loadMatches(true); }, 5000);
    return () => clearInterval(timer);
  }, [role, donorStatus]);

  const statusText = useMemo(() => {
    if (donorStatus === 'unavailable' && unavailableUntil) return `Unavailable until ${unavailableUntil.toLocaleDateString()}`;
    if (donorStatus === 'available') return 'Available';
    return 'Not a donor';
  }, [donorStatus, unavailableUntil]);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    content: { paddingVertical: 16, paddingBottom: 40 },
    topRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
    header: { fontSize: 18, fontWeight: '800', color: semanticColors.textPrimary },
    toast: { position: 'absolute', top: 10, left: 16, right: 16, zIndex: 10, backgroundColor: semanticColors.bgSurface, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: semanticColors.borderSubtle },
    toastText: { color: semanticColors.textPrimary, fontWeight: '700' },
    toastCtaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    toastCta: { color: colors.primary, fontWeight: '800' },
    topActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginTop: 8 },
    switchPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: semanticColors.bgSurface, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    switchPillText: { color: semanticColors.textPrimary, fontWeight: '700' },
    card: { alignSelf: 'center', width: '92%', backgroundColor: semanticColors.bgSurface, padding: 16, borderRadius: 16, marginTop: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    cardTitle: { fontSize: 16, fontWeight: '700', color: semanticColors.textPrimary, marginBottom: 8 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    badge: { backgroundColor: semanticColors.bgAlt, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    badgeOk: { backgroundColor: semanticColors.interactivePrimaryActive },
    badgeWarn: { backgroundColor: semanticColors.interactiveDanger },
    badgeMuted: { backgroundColor: semanticColors.bgAlt },
    badgeText: { color: semanticColors.textPrimary, fontWeight: '700' },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    metaKey: { color: semanticColors.textSecondary },
    metaVal: { color: semanticColors.textPrimary, fontWeight: '700' },
    listItem: { borderTopWidth: 1, borderTopColor: semanticColors.borderSubtle, paddingVertical: 10 },
    itemTitle: { color: semanticColors.textPrimary, fontWeight: '600' },
    itemMeta: { color: semanticColors.textSecondary, marginTop: 2 },
    empty: { color: semanticColors.textSecondary },
    profileBtn: { alignSelf: 'center', marginTop: 16, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
    profileBtnText: { color: semanticColors.textInverse, fontWeight: '700' },
    linkPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
    linkPillTxt: { color: semanticColors.textInverse, fontWeight: '800' },
  }), [isDark]);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {!!toast && (
        <View style={s.toast}>
          <Text style={s.toastText}>{toast.text}</Text>
          <TouchableOpacity style={s.toastCtaBtn} onPress={() => router.push({ pathname: '/matchedRequestDetail', params: { id: toast.id } })}>
            <IconSymbol name="eye.fill" size={14} color={colors.primary} />
            <Text style={s.toastCta}>View</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.topRowBetween}>
          <Text style={s.header}>Donor Dashboard</Text>
          <TouchableOpacity style={s.linkPill} onPress={openLatestMatchOrNotification}>
            <IconSymbol name="bell.fill" size={16} color={semanticColors.textInverse} />
            <Text style={s.linkPillTxt}>View Matched Requests</Text>
          </TouchableOpacity>
        </View>
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
              onPress: openLatestMatchOrNotification,
            },
          ]}
        />

        {/* Role switching removed per policy */}

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

        {/* Notifications - tap "You are matched" opens same screen as View Matched Requests */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Notifications</Text>
          {notes?.length ? notes.slice(0, 5).map((n: any, i: number) => (
            <Pressable style={s.listItem} key={String(n._id || i)} onPress={() => onNotificationPress(n)}>
              <Text style={s.itemTitle}>{n.title || n.message || 'Notification'}</Text>
              <Text style={s.itemMeta}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Text>
            </Pressable>
          )) : <Text style={s.empty}>No notifications.</Text>}
        </View>

        <TouchableOpacity style={s.profileBtn} onPress={() => router.push('/(home)/profile')}>
          <Text style={s.profileBtnText}>Go to Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// styles moved inside component
