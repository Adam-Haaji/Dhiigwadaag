import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import { router } from 'expo-router';
import HeroCard from '@/components/HeroCard';
import { StatusBar } from 'expo-status-bar';
import colorsBase, { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { ChatbotButton, ChatbotPanel } from '@/components/chatbot';

export default function RequesterDashboard() {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
  const [active, setActive] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: semanticColors.bgAlt },
        content: { paddingVertical: 16, paddingBottom: 40 },
        topActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginTop: 8 },
        switchPill: {
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: semanticColors.bgSurface,
          borderWidth: 1,
          borderColor: semanticColors.borderSubtle,
        },
        switchPillText: { color: semanticColors.textPrimary, fontWeight: '700' },
        card: {
          alignSelf: 'center',
          width: '92%',
          backgroundColor: semanticColors.bgSurface,
          padding: 16,
          borderRadius: 16,
          marginTop: 12,
          borderWidth: 1,
          borderColor: semanticColors.borderSubtle,
        },
        cardTitle: { fontSize: 16, fontWeight: '700', color: semanticColors.textPrimary, marginBottom: 8 },
        listItem: { borderTopWidth: 1, borderTopColor: semanticColors.borderSubtle, paddingVertical: 10 },
        itemTitle: { color: semanticColors.textPrimary, fontWeight: '600' },
        itemMeta: { color: semanticColors.textSecondary, marginTop: 2 },
        empty: { color: semanticColors.textSecondary },
        profileBtn: {
          alignSelf: 'center',
          marginTop: 16,
          backgroundColor: semanticColors.interactivePrimary,
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 12,
        },
        profileBtnText: { color: semanticColors.textInverse, fontWeight: '700' },
      }),
    [isDark]
  );

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
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {/* Hero (top rectangle styled like image 1) */}
        <HeroCard
          title="Emergency Alert"
          subtitle="Critical situation — immediate action"
          ctas={[
            { icon: 'exclamationmark.triangle.fill', bg: colorsBase.palette.danger, label: 'Search', onPress: () => router.push('/emergencyRequest') },
            { icon: 'phone.fill', bg: colorsBase.palette.warning, label: 'Emergency Call', onPress: () => router.push('/emergencyRequest') },
          ]}
        />

        {/* Role switching removed per policy */}

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

      {/* Floating chatbot button — Requester Assistant */}
      <ChatbotButton onPress={() => setChatOpen(true)} />
      <ChatbotPanel visible={chatOpen} onClose={() => setChatOpen(false)} />
    </SafeAreaView>
  );
}
