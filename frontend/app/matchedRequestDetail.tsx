import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function MatchedRequestDetail() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'donor'|'requester' }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<'accept'|'complete'|null>(null);
  const [declining, setDeclining] = useState(false);

  const status = String(request?.status || '').toLowerCase();
  const showAcceptButton = status === 'matched';
  const showIHaveDonatedButton = status === 'accepted';

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      // Use unified request detail endpoint for both donor and requester views
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
  const isAccepted = status === 'accepted' || status === 'fulfilled';
  const contactHidden = !!request?.contactHidden;
  const requesterPhone = mode === 'donor'
    ? (!contactHidden && isAccepted ? (requester?.phone || request?.contactPhone || '—') : 'Hidden until you accept')
    : (requester?.phone || request?.contactPhone || '—');
  const bloodType = request?.bloodType || '—';
  const units = typeof request?.units !== 'undefined' ? String(request.units) : null;
  const location = request?.location || '—';
  const createdAt = request?.createdAt ? new Date(request.createdAt).toLocaleString() : '—';

  const onAccept = async () => {
    if (!id) return;
    setActing('accept');
    try {
      // Accepting a matched request is done via the Requests API
      // The `id` here refers to the request ID, not a match ID
      await api.acceptRequest(String(id));
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
      await api.completeDonation(String(id));
      await load();
      Alert.alert('Thank you', 'Donation recorded successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not complete');
    } finally {
      setActing(null);
    }
  };

  const onDecline = async () => {
    if (!id) return;
    Alert.alert('Decline Request', 'Are you sure you want to decline this matched request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          setDeclining(true);
          try {
                // Decline always goes through Requests API
                await api.declineDonation(String(id));
            await load();
            Alert.alert('Declined', 'You declined this request. We will try to rematch the requester.');
            router.replace('/donorMatches');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not decline');
          } finally {
            setDeclining(false);
          }
        }
      }
    ]);
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

        {mode === 'donor' && showAcceptButton && (
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} disabled={acting==='accept'} onPress={onAccept}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
            <Text style={styles.btnText}>{acting==='accept' ? 'Accepting...' : 'Accept & Donate'}</Text>
          </TouchableOpacity>
        )}

        {mode === 'donor' && showAcceptButton && (
          <TouchableOpacity style={[styles.btn, styles.declineBtn]} disabled={declining} onPress={onDecline}>
            <IconSymbol name="xmark.circle.fill" size={20} color="#fff" />
            <Text style={styles.btnText}>{declining ? 'Declining...' : 'Decline'}</Text>
          </TouchableOpacity>
        )}

        {mode === 'donor' && showIHaveDonatedButton && (
          <TouchableOpacity style={[styles.btn, styles.completeBtn]} disabled={acting==='complete'} onPress={onComplete}>
            <IconSymbol name="heart.fill" size={20} color="#fff" />
            <Text style={styles.btnText}>{acting==='complete' ? 'Submitting...' : 'I Have Donated'}</Text>
          </TouchableOpacity>
        )}
        {mode === 'donor' && isAccepted && !contactHidden && (requester?.phone || request?.contactPhone) && (
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => {
            const phone = requester?.phone || request?.contactPhone;
            if (phone) {
              const tel = `tel:${String(phone)}`;
              Linking.openURL(tel).catch(() => {
                Alert.alert('Unable to open dialer', String(phone));
              });
            }
          }}>
            <IconSymbol name="phone.fill" size={20} color="#fff" />
            <Text style={styles.btnText}>Call Requester</Text>
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
  declineBtn: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
});
