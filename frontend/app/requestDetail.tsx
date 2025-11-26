import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import apiClient from '../service/api';
import { colors } from '@/styles/commonStyles';
import useAuthHook from '@/hooks/useAuth';

export default function RequestDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthHook();
  const userId: string | undefined = (user as any)?._id || (user as any)?.id;
  const userEmail: string | undefined = (user as any)?.email?.toLowerCase?.();
  const isAdmin = String((user as any)?.role || '').toLowerCase() === 'admin';
  // Removed unused isDonor variable.
  const ownerById = !!(data?.requesterId?._id && userId && data.requesterId._id === userId);
  const ownerByEmail = !!(data?.requester?.email && userEmail && String(data.requester.email).toLowerCase() === userEmail);
  const isOwnerOrAdmin = !!(user && (isAdmin || ownerById || ownerByEmail));

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
  const doc = await apiClient.getRequest(id);
      setData(doc);
    } catch (err: any) {
      setError(err?.message || 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const getRequesterPhone = (): string | undefined => {
    return data?.requester?.phone || data?.requesterId?.phone;
  };

  const handleResponse = async (method: 'call'|'whatsapp'|'donate') => {
    if (!id) return;
    if (!userId) { Alert.alert('Login required', 'Please log in before responding.'); return; }
    try {
      setSubmitting(true);
  await apiClient.respondToRequest(id, { donorId: userId, method });
      Alert.alert('Success', 'Your response has been recorded.');
      await load();
    } catch {
      Alert.alert('Error', 'Could not record response.');
    } finally {
      setSubmitting(false);
    }
  };

  const callRequester = async () => {
    const phone = getRequesterPhone();
    if (!phone) { Alert.alert('No phone', 'Requester phone number is unavailable.'); return; }
    await handleResponse('call');
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to open dialer.'));
  };

  const whatsappRequester = async () => {
    const phone = getRequesterPhone();
    if (!phone) { Alert.alert('No phone', 'Requester phone number is unavailable.'); return; }
    const text = encodeURIComponent('Hello, I can donate for your blood request.');
    const waUrl = `whatsapp://send?phone=${phone}&text=${text}`;
    const waWeb = `https://wa.me/${phone}?text=${text}`;
    const canOpen = await Linking.canOpenURL('whatsapp://send');
    await handleResponse('whatsapp');
    if (canOpen) {
      Linking.openURL(waUrl).catch(() => Alert.alert('Error', 'Unable to open WhatsApp.'));
    } else {
      Linking.openURL(waWeb).catch(() => Alert.alert('Error', 'Unable to open WhatsApp link.'));
    }
  };

  const handleDonorFulfill = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      // Preferred: use fulfill endpoint; fallback to respond 'donate' if forbidden
      try {
  const res = await apiClient.fulfillRequest(id);
        if (!res?.success) throw new Error('fulfill_failed');
  } catch {
        // fallback
  await apiClient.respondToRequest(id, { donorId: userId!, method: 'donate' });
      }
      Alert.alert('Success', 'Donation fulfilled successfully ✅');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to confirm donation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ title: 'Request Details', headerShown: true }} />
      {loading && (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      )}
      {!loading && error && (
        <View style={s.center}><Text style={s.error}>{error}</Text></View>
      )}
      {!loading && !error && data && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <View style={[s.badge, badgeStyle(data.status)]}>
              <Text style={s.badgeText}>{data.status}</Text>
            </View>
            <Text style={s.title}>Patient: {data.patientName}</Text>
            <Text style={[s.statusText, { color: statusColor(data.status) }]}>Status: {data.status}</Text>
            <Text style={s.row}>Blood Type: <Text style={s.bold}>{data.bloodType}</Text></Text>
            <Text style={s.row}>Urgency: <Text style={s.bold}>{data.urgency}</Text></Text>
            {typeof data.units !== 'undefined' && (
              <Text style={s.row}>Units: <Text style={s.bold}>{String(data.units)}</Text></Text>
            )}
            <Text style={s.row}>Location: <Text style={s.bold}>{data.location}</Text></Text>
            <Text style={s.row}>Status: <Text style={s.bold}>{data.status}</Text></Text>
          </View>

          {data.requesterId && (
            <View style={s.card}>
              <Text style={s.section}>Requester</Text>
              <Text style={s.row}>Name: <Text style={s.bold}>{data.requesterId.name}</Text></Text>
              <Text style={s.row}>Phone: <Text style={s.bold}>{data.requesterId.phone}</Text></Text>
              <Text style={s.row}>Email: <Text style={s.bold}>{data.requesterId.email}</Text></Text>
              <Text style={s.row}>Blood Type: <Text style={s.bold}>{data.requesterId.bloodType}</Text></Text>
              <Text style={s.row}>Location: <Text style={s.bold}>{data.requesterId.location}</Text></Text>
            </View>
          )}

          <View style={s.actionsCol}>
            <TouchableOpacity style={[s.actionBtnFull, { backgroundColor: colors.success }]} disabled={submitting} onPress={callRequester}>
              <Text style={s.actionTxt}>Call Requester</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtnFull, { backgroundColor: '#25D366' }]} disabled={submitting} onPress={whatsappRequester}>
              <Text style={s.actionTxt}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.cta, { backgroundColor: '#E53935' }]} disabled={submitting} onPress={() => handleResponse('donate')}>
            <Text style={s.ctaText}>I Can Donate</Text>
          </TouchableOpacity>

          {(() => {
            const v = String(data.status || '').toLowerCase() === 'matched';
            const matchedUserId = (data as any)?.matchedDonorUser || (data?.matchedDonorId && (data.matchedDonorId as any)._id);
            const isMatchedDonorUser = matchedUserId && userId && String(matchedUserId) === String(userId);
            return (v && isMatchedDonorUser);
          })() && (
            <TouchableOpacity style={[s.cta, { backgroundColor: '#2E7D32' }]} disabled={submitting} onPress={handleDonorFulfill}>
              <Text style={s.ctaText}>I Have Donated</Text>
            </TouchableOpacity>
          )}

          {isOwnerOrAdmin && data.status !== 'Fulfilled' && data.status !== 'Cancelled' && (
            <TouchableOpacity
              onPress={async () => {
                if (!id) return;
                try {
                  setSubmitting(true);
                  const res = await apiClient.fulfillRequest(id);
                  if (res?.success) {
                    Alert.alert('Success', 'Request marked as Fulfilled successfully.');
                    await load();
                  } else {
                    Alert.alert('Error', 'Could not update status.');
                  }
                } catch {
                  Alert.alert('Error', 'Could not update status.');
                } finally {
                  setSubmitting(false);
                }
              }}
              style={{ backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, marginTop: 10 }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Mark as Fulfilled</Text>
            </TouchableOpacity>
          )}

          {isOwnerOrAdmin && data.status !== 'Fulfilled' && data.status !== 'Cancelled' && (
            <TouchableOpacity
              onPress={async () => {
                if (!id) return;
                try {
                  setSubmitting(true);
                  const res = await apiClient.cancelRequest(id);
                  if (res?.success) {
                    Alert.alert('Success', 'This blood request has been cancelled.');
                    await load();
                  } else {
                    Alert.alert('Error', 'Could not cancel request.');
                  }
                } catch {
                  Alert.alert('Error', 'Could not cancel request.');
                } finally {
                  setSubmitting(false);
                }
              }}
              style={{ backgroundColor: '#B71C1C', padding: 14, borderRadius: 10, marginTop: 10 }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Cancel Request</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12, position: 'relative' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  row: { fontSize: 14, color: colors.text, marginBottom: 4 },
  bold: { fontWeight: '700' },
  error: { color: '#E74C3C' },
  actionsCol: { gap: 12, marginTop: 4 },
  actionBtnFull: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionTxt: { color: '#fff', fontWeight: '700' },
  cta: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  ctaText: { color: '#fff', fontWeight: '700' },
  badge: { position: 'absolute', right: 12, top: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  statusText: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
});

function badgeStyle(status?: string) {
  const base = { backgroundColor: '#9E9E9E' } as any;
  switch ((status || '').toLowerCase()) {
    case 'pending': return { backgroundColor: '#9E9E9E' };
    case 'contacted': return { backgroundColor: '#1976D2' };
    case 'matched': return { backgroundColor: '#2E7D32' };
    case 'fulfilled': return { backgroundColor: '#6A1B9A' };
    case 'cancelled': return { backgroundColor: '#B71C1C' };
    default: return base;
  }
}

function statusColor(status?: string) {
  const v = (status || '').toLowerCase();
  if (v === 'fulfilled') return '#2E7D32';
  if (v === 'matched') return '#F39C12';
  if (v === 'contacted') return '#1976D2';
  if (v === 'cancelled') return '#B71C1C';
  return '#9E9E9E';
}
