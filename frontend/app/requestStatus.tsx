import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import apiClient from '../service/api';
import colorsBase, { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { notify } from '@/ui/feedback/notify';

export default function RequestStatus() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id as string | undefined;
  const { isDark } = useTheme();
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

  const handleDonorConfirm = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
  await apiClient.donorConfirmDonation(id);
      notify.success('Donation fulfilled successfully ✅');
      await load();
    } catch (e: any) {
      notify.error('Error', e?.message || 'Unable to confirm donation');
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

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    card: { backgroundColor: semanticColors.bgSurface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    title: { fontSize: 18, fontWeight: '700', color: semanticColors.textPrimary, marginBottom: 8 },
    section: { fontSize: 16, fontWeight: '700', color: semanticColors.textPrimary, marginBottom: 8 },
    row: { fontSize: 14, color: semanticColors.textPrimary, marginBottom: 4 },
    bold: { fontWeight: '700', color: semanticColors.textPrimary },
    error: { color: semanticColors.interactiveDanger },
    donateBtn: { marginTop: 12, backgroundColor: colorsBase.palette.success, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    donateTxt: { color: semanticColors.textInverse, fontWeight: '700' },
    successNote: { color: colorsBase.palette.success, marginBottom: 6 },
  }), [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Request Status', headerShown: true }} />
      {loading && (
        <View style={styles.center}><ActivityIndicator color={semanticColors.interactivePrimary} /></View>
      )}
      {!loading && error && (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      )}
      {!loading && !error && data && (
        <ScrollView contentContainerStyle={styles.content}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <View style={styles.card}>
            <Text style={styles.title}>{statusMessage(data.status)}</Text>
            <Text style={styles.row}>Patient: <Text style={styles.bold}>{data.patientName}</Text></Text>
            <Text style={styles.row}>Blood Group: <Text style={styles.bold}>{data.bloodGroup || data.bloodType}</Text></Text>
            <Text style={styles.row}>District: <Text style={styles.bold}>{data.district || data.location}</Text></Text>
            <Text style={styles.row}>Urgency: <Text style={styles.bold}>{data.urgencyLevel || data.urgentLevel || data.urgency}</Text></Text>
            <Text style={styles.row}>Status: <Text style={styles.bold}>{data.status}</Text></Text>
            {data.fulfilledAt && <Text style={styles.row}>Fulfilled At: <Text style={styles.bold}>{new Date(data.fulfilledAt).toLocaleString()}</Text></Text>}
          </View>

          {data.donorId && (
            <View style={styles.card}>
              <Text style={styles.section}>Matched Donor</Text>
              <Text style={styles.row}>Donor ID: <Text style={styles.bold}>{data.donorId._id || data.donorId}</Text></Text>
              {data.donorId.fullName && (
                <Text style={styles.row}>Name: <Text style={styles.bold}>{data.donorId.fullName}</Text></Text>
              )}
              {data.donorId.phone && (
                <Text style={styles.row}>Phone: <Text style={styles.bold}>{data.donorId.phone}</Text></Text>
              )}
              {data.donorId.bloodGroup && (
                <Text style={styles.row}>Blood Group: <Text style={styles.bold}>{data.donorId.bloodGroup}</Text></Text>
              )}

              {String(data.status || '').toLowerCase() === 'matched' && isMatched && (
                <>
                  <Text style={[styles.row, styles.successNote]}>You are the matched donor for this request.</Text>
                  <TouchableOpacity style={[styles.donateBtn, { marginTop: 8 }]} disabled={submitting} onPress={handleDonorConfirm}>
                    <Text style={styles.donateTxt}>I Have Donated</Text>
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

