import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, TouchableOpacity, Platform, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import apiClient from '../service/api';
import { colors } from '@/styles/commonStyles';

export default function RequestStatus() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMatched, setIsMatched] = useState<boolean>(false);
  // Auth context currently unused in this view; removed to satisfy lint.
  // Removed unused userId and isDonor to satisfy lint warnings; matching handled by backend response.

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      // Use unified Requests endpoint; BloodRequests caused 404 for Active Requests
      const doc = await apiClient.getRequest(id);
      setData(doc);
      // Ask backend if current user is the matched donor for this request
      if (String(doc?.status || '').toLowerCase() === 'matched') {
        try {
          const resp: any = await apiClient.isMatchedDonor(id);
          setIsMatched(!!resp?.isMatched);
        } catch {
          setIsMatched(false);
        }
      } else {
        setIsMatched(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('Info', msg);
  };

  const handleDonorConfirm = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
  await apiClient.donorConfirmDonation(id);
      notify('Donation fulfilled successfully ✅');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to confirm donation');
    } finally {
      setSubmitting(false);
    }
  };

  const statusMessage = (status?: string) => {
    switch (status) {
      case 'pending': return 'Waiting for a donor...';
      case 'matched': return 'A donor has been found!';
      case 'accepted': return 'Donor has accepted your request.';
      case 'donated': return 'Donation completed by donor.';
      case 'completed': return 'Request fulfilled. Blood received.';
      case 'cancelled': return 'Request has been cancelled.';
      default: return 'Unknown status';
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ title: 'Request Status', headerShown: true }} />
      {loading && (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      )}
      {!loading && error && (
        <View style={s.center}><Text style={s.error}>{error}</Text></View>
      )}
      {!loading && !error && data && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.title}>{statusMessage(data.status)}</Text>
            <Text style={s.row}>Patient: <Text style={s.bold}>{data.patientName}</Text></Text>
            <Text style={s.row}>Blood Group: <Text style={s.bold}>{data.bloodGroup || data.bloodType}</Text></Text>
            <Text style={s.row}>District: <Text style={s.bold}>{data.district || data.location}</Text></Text>
            <Text style={s.row}>Urgency: <Text style={s.bold}>{data.urgencyLevel || data.urgentLevel || data.urgency}</Text></Text>
            <Text style={s.row}>Status: <Text style={s.bold}>{data.status}</Text></Text>
            {data.fulfilledAt && <Text style={s.row}>Fulfilled At: <Text style={s.bold}>{new Date(data.fulfilledAt).toLocaleString()}</Text></Text>}
          </View>

          {data.donorId && (
            <View style={s.card}>
              <Text style={s.section}>Matched Donor</Text>
              <Text style={s.row}>Donor ID: <Text style={s.bold}>{data.donorId._id || data.donorId}</Text></Text>
              {data.donorId.fullName && (
                <Text style={s.row}>Name: <Text style={s.bold}>{data.donorId.fullName}</Text></Text>
              )}
              {data.donorId.phone && (
                <Text style={s.row}>Phone: <Text style={s.bold}>{data.donorId.phone}</Text></Text>
              )}
              {data.donorId.bloodGroup && (
                <Text style={s.row}>Blood Group: <Text style={s.bold}>{data.donorId.bloodGroup}</Text></Text>
              )}

              {String(data.status || '').toLowerCase() === 'matched' && isMatched && (
                <>
                  <Text style={[s.row, { color: '#2E7D32', marginBottom: 6 }]}>You are the matched donor for this request.</Text>
                  <TouchableOpacity style={[s.donateBtn, { marginTop: 8 }]} disabled={submitting} onPress={handleDonorConfirm}>
                    <Text style={s.donateTxt}>I Have Donated</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
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
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  row: { fontSize: 14, color: colors.text, marginBottom: 4 },
  bold: { fontWeight: '700' },
  error: { color: '#E74C3C' },
  donateBtn: { marginTop: 12, backgroundColor: '#2E7D32', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  donateTxt: { color: '#fff', fontWeight: '700' }
});
