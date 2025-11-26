import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function MatchedRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<'accept'|'complete'|null>(null);

  const status = String(request?.status || '').toLowerCase();
  const showAcceptButton = status === 'matched';
  const showIHaveDonatedButton = status === 'accepted';

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getRequest(String(id));
      setRequest(res);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const requester = request?.requester || request?.requesterId || {};
  const requesterName = requester?.name || requester?.email || 'Requester';
  const requesterPhone = requester?.phone || '—';
  const bloodType = request?.bloodType || '—';
  const units = typeof request?.units !== 'undefined' ? String(request.units) : null;
  const location = request?.location || '—';
  const createdAt = request?.createdAt ? new Date(request.createdAt).toLocaleString() : '—';

  const onAccept = async () => {
    if (!id) return;
    setActing('accept');
    try {
      await api.acceptDonation(String(id));
      await load();
      Alert.alert('Accepted', 'You accepted this request. Please proceed to donate.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not accept');
    } finally {
      setActing(null);
    }
  };

  const onComplete = async () => {
    if (!id) return;
    setActing('complete');
    try {
      await api.confirmDonationComplete(String(id));
      Alert.alert('Thank you', 'Donation successfully recorded.');
      router.replace('/(home)/donor');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not complete');
    } finally {
      setActing(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerIconWrap}>
              <IconSymbol name="drop.fill" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.title}>Matched Request</Text>
              <Text style={styles.sub}>Blood Type {bloodType} • {location}</Text>
            </View>
          </View>
          <Text style={styles.meta}>Requested by {requesterName}</Text>
          <Text style={styles.meta}>Contact: {requesterPhone}</Text>
          {units && <Text style={styles.meta}>Units: {units}</Text>}
          <Text style={styles.meta}>Created: {createdAt}</Text>
        </View>

        {showAcceptButton && (
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} disabled={acting==='accept'} onPress={onAccept}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
            <Text style={styles.btnText}>{acting==='accept' ? 'Accepting...' : 'Accept & Donate'}</Text>
          </TouchableOpacity>
        )}

        {showIHaveDonatedButton && (
          <TouchableOpacity style={[styles.btn, styles.completeBtn]} disabled={acting==='complete'} onPress={onComplete}>
            <IconSymbol name="heart.fill" size={20} color="#fff" />
            <Text style={styles.btnText}>{acting==='complete' ? 'Submitting...' : 'I Have Donated'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  headerCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.textSecondary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  acceptBtn: { backgroundColor: colors.accent },
  completeBtn: { backgroundColor: colors.primary },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
});
