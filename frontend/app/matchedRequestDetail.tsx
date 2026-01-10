import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { StatusBar } from 'expo-status-bar';
import colorsBase, { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function MatchedRequestDetail() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'donor'|'requester' }>();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<'accept'|'complete'|null>(null);
  const [declining, setDeclining] = useState(false);
  const [showDonor, setShowDonor] = useState(false);
  const [donorLoading, setDonorLoading] = useState(false);
  const [donorError, setDonorError] = useState<string | null>(null);
  const [donorProfile, setDonorProfile] = useState<any | null>(null);

  const status = String(request?.status || '').toLowerCase();
  const showAcceptButton = status === 'matched';
  const showIHaveDonatedButton = status === 'accepted';

  // Notifications don't always pass `mode`. Default to donor unless the logged-in role is requester.
  const role = String(user?.user?.role || '').toLowerCase();
  const effectiveMode: 'donor' | 'requester' = (mode || (role === 'requester' ? 'requester' : 'donor')) as any;
  const isRequesterView = effectiveMode === 'requester';

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
  const requesterPhone = effectiveMode === 'donor'
    ? (!contactHidden && isAccepted ? (requester?.phone || request?.contactPhone || '—') : 'Hidden until you accept')
    : (requester?.phone || request?.contactPhone || '—');
  const bloodType = request?.bloodType || '—';
  const units = typeof request?.units !== 'undefined' ? String(request.units) : null;
  const location = request?.location || '—';
  const patientName = request?.patientName || request?.patient || request?.patient_fullname || '—';
  const hospitalName = request?.hospitalName || request?.hospital || request?.hospital_name || '—';
  const createdAt = request?.createdAt ? new Date(request.createdAt).toLocaleString() : '—';

  // Important: In the legacy Request flow, `matchedDonorId` is a *User id* (string).
  // In other flows, a donor object may be present (Donor document) under `donor` / `matchedDonorId`.
  const matchedDonorObj = (request?.matchedDonorId && typeof request.matchedDonorId === 'object')
    ? (request.matchedDonorId as any)
    : null;

  const isDonorDocumentShape = (obj: any) => {
    if (!obj || typeof obj !== 'object') return false;
    // Donor docs typically have these fields; User docs typically do not.
    return Boolean(obj.fullName || obj.bloodGroup || obj.district);
  };

  const donorDocId =
    (request?.donor && (request.donor as any)._id) ||
    (matchedDonorObj && isDonorDocumentShape(matchedDonorObj) ? matchedDonorObj._id : null) ||
    null;

  const donorUserId =
    // If matchedDonorId is a populated User object, its _id is the user id
    (matchedDonorObj && !isDonorDocumentShape(matchedDonorObj) && matchedDonorObj._id ? String(matchedDonorObj._id) : null) ||
    // If matchedDonorId is stored as a raw string
    (request?.matchedDonorId && typeof request.matchedDonorId !== 'object' ? String(request.matchedDonorId) : null) ||
    // BloodRequest mapping includes matchedDonorUser
    (request?.matchedDonorUser ? String(request.matchedDonorUser) : null) ||
    // If request has donor doc with linked user
    (request?.donor && (request.donor as any).user ? String((request.donor as any).user) : null) ||
    null;

  const onContactDonor = async () => {
    setShowDonor(true);
    setDonorError(null);
    setDonorLoading(true);

    // Clear previous donor info so the UI doesn't show stale data while loading.
    setDonorProfile(null);

    // If we already have basic donor fields in request, surface them immediately
    const basicDonor = (request?.donor as any) || (request?.matchedDonorId as any);
    if (basicDonor && typeof basicDonor === 'object') {
      setDonorProfile({
        name: basicDonor?.fullName || basicDonor?.name || basicDonor?.email,
        email: basicDonor?.email,
        phone: basicDonor?.phone,
        location: basicDonor?.district || basicDonor?.location,
        bloodType: basicDonor?.bloodGroup || basicDonor?.bloodType,
      });
    }

    try {
      // Prefer Donor-document profile when we have a Donor id
      if (donorDocId) {
        const d = await api.getDonorProfile(String(donorDocId));
        setDonorProfile({
          name: d?.fullName || d?.name,
          email: d?.email,
          phone: d?.phone,
          location: d?.district || d?.location,
          bloodType: d?.bloodGroup || d?.bloodType,
        });
        return;
      }

      // Legacy Request flow: matched donor is stored as a *User id*
      if (donorUserId) {
        const u = await api.get(`/api/users/${encodeURIComponent(String(donorUserId))}`);
        setDonorProfile({
          name: u?.name || u?.fullName || u?.email,
          email: u?.email,
          phone: u?.phone,
          location: u?.location || u?.district,
        });
        return;
      }

      setDonorError('Donor details are not available yet.');
    } catch (e: any) {
      setDonorError(e?.message || 'Unable to load donor details');
    } finally {
      setDonorLoading(false);
    }
  };

  const donorPhone = donorProfile?.phone;
  const callDonorFromRequester = () => {
    if (!donorPhone) {
      Alert.alert('No phone', 'Donor phone number is unavailable.');
      return;
    }
    Linking.openURL(`tel:${donorPhone}`).catch(() => Alert.alert('Error', 'Unable to open dialer.'));
  };
  const callDonor = () => {
    if (!donorPhone) { Alert.alert('No phone', 'Donor phone number is unavailable.'); return; }
    Linking.openURL(`tel:${donorPhone}`).catch(() => Alert.alert('Error', 'Unable to open dialer.'));
  };
  const whatsappDonor = async () => {
    if (!donorPhone) { Alert.alert('No phone', 'Donor phone number is unavailable.'); return; }
    const text = encodeURIComponent('Hello, I would like to contact you regarding blood donation.');
    const waUrl = `whatsapp://send?phone=${donorPhone}&text=${text}`;
    const waWeb = `https://wa.me/${donorPhone}?text=${text}`;
    const canOpen = await Linking.canOpenURL('whatsapp://send');
    if (canOpen) {
      Linking.openURL(waUrl).catch(() => Alert.alert('Error', 'Unable to open WhatsApp.'));
    } else {
      Linking.openURL(waWeb).catch(() => Alert.alert('Error', 'Unable to open WhatsApp link.'));
    }
  };

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

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    content: { padding: 20, paddingBottom: 40 },
    headerCard: { backgroundColor: semanticColors.bgSurface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: semanticColors.borderSubtle, marginBottom: 18 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: semanticColors.interactivePrimary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    title: { fontSize: 18, fontWeight: '800', color: semanticColors.textPrimary },
    sub: { fontSize: 13, color: semanticColors.textSecondary },
    meta: { fontSize: 12, color: semanticColors.textSecondary, marginTop: 4 },
    tag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
    tagTxt: { color: semanticColors.textInverse, fontWeight: '800', fontSize: 12 },
    tagRequester: { backgroundColor: semanticColors.interactiveDanger },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 10 },
    acceptBtn: { backgroundColor: semanticColors.interactivePrimary },
    completeBtn: { backgroundColor: semanticColors.interactivePrimaryActive },
    declineBtn: { backgroundColor: semanticColors.borderStrong },
    callBtn: { backgroundColor: colorsBase.palette.success },
    btnText: { color: semanticColors.textInverse, fontWeight: '700', fontSize: 16, marginLeft: 8 },
    errorText: { color: semanticColors.interactiveDanger },
  }), [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isRequesterView && (
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="drop.fill" size={20} color={semanticColors.textInverse} />
              </View>
              <View>
                <Text style={styles.title}>Matched Request</Text>
                <Text style={styles.sub}>Blood Type {bloodType} • {location}</Text>
              </View>
            </View>
            <Text style={styles.meta}>Patient: {patientName}</Text>
            <Text style={styles.meta}>Hospital: {hospitalName}</Text>
            <Text style={styles.meta}>Requested by {requesterName}</Text>
            <Text style={styles.meta}>Contact: {requesterPhone}</Text>
            {units && <Text style={styles.meta}>Units: {units}</Text>}
            <Text style={styles.meta}>Created: {createdAt}</Text>
          </View>
        )}

        {isRequesterView && (
          <>
            <View style={styles.headerCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>Request Details</Text>
                <View style={[styles.tag, styles.tagRequester]}>
                  <Text style={styles.tagTxt}>Requester</Text>
                </View>
              </View>
              <Text style={styles.meta}>Patient: {patientName}</Text>
              <Text style={styles.meta}>Hospital: {hospitalName}</Text>
              <Text style={styles.meta}>Location: {location}</Text>
              <Text style={styles.meta}>Blood Type: {bloodType}</Text>
              {units && <Text style={styles.meta}>Units: {units}</Text>}
              <Text style={styles.meta}>Created: {createdAt}</Text>
            </View>

            <View style={styles.headerCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>Donor Details</Text>
                <View style={[styles.tag, styles.tagRequester]}>
                  <Text style={styles.tagTxt}>Requester</Text>
                </View>
              </View>
              <Text style={styles.meta}>Name: {donorProfile?.name || 'Unknown'}</Text>
              <Text style={styles.meta}>Location: {donorProfile?.location || '—'}</Text>
              <Text style={styles.meta}>Blood Type: {donorProfile?.bloodType || '—'}</Text>
              <Text style={styles.meta}>Email: {donorProfile?.email || '—'}</Text>
              <Text style={styles.meta}>Phone: {donorProfile?.phone || '—'}</Text>
              {donorLoading && (
                <View style={{ marginTop: 10 }}>
                  <ActivityIndicator color={semanticColors.interactivePrimary} />
                </View>
              )}
              {donorError && !donorLoading && (
                <Text style={[styles.meta, styles.errorText]}>{donorError}</Text>
              )}
            </View>

            {status === 'accepted' && (
              <TouchableOpacity style={[styles.btn, styles.completeBtn]} disabled={donorLoading} onPress={onContactDonor}>
                <Text style={[styles.btnText, { marginLeft: 0 }]}>Contact Donor</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.btn, styles.callBtn]} onPress={callDonorFromRequester}>
              <Text style={[styles.btnText, { marginLeft: 0 }]}>Call Donor</Text>
            </TouchableOpacity>

            {!!donorProfile?.phone && (
              <TouchableOpacity style={[styles.btn, styles.completeBtn]} onPress={whatsappDonor}>
                <Text style={[styles.btnText, { marginLeft: 0 }]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {effectiveMode === 'donor' && showAcceptButton && (
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} disabled={acting==='accept'} onPress={onAccept}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={semanticColors.textInverse} />
            <Text style={styles.btnText}>{acting==='accept' ? 'Accepting...' : 'Accept & Donate'}</Text>
          </TouchableOpacity>
        )}

        {effectiveMode === 'donor' && showAcceptButton && (
          <TouchableOpacity style={[styles.btn, styles.declineBtn]} disabled={declining} onPress={onDecline}>
            <IconSymbol name="xmark.circle.fill" size={20} color={semanticColors.textInverse} />
            <Text style={styles.btnText}>{declining ? 'Declining...' : 'Decline'}</Text>
          </TouchableOpacity>
        )}

        {effectiveMode === 'donor' && showIHaveDonatedButton && (
          <TouchableOpacity style={[styles.btn, styles.completeBtn]} disabled={acting==='complete'} onPress={onComplete}>
            <IconSymbol name="heart.fill" size={20} color={semanticColors.textInverse} />
            <Text style={styles.btnText}>{acting==='complete' ? 'Submitting...' : 'I Have Donated'}</Text>
          </TouchableOpacity>
        )}
        {/* Requester view uses the custom layout above */}
        {effectiveMode === 'donor' && isAccepted && !contactHidden && (requester?.phone || request?.contactPhone) && (
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => {
            const phone = requester?.phone || request?.contactPhone;
            if (phone) {
              const tel = `tel:${String(phone)}`;
              Linking.openURL(tel).catch(() => {
                Alert.alert('Unable to open dialer', String(phone));
              });
            }
          }}>
            <IconSymbol name="phone.fill" size={20} color={semanticColors.textInverse} />
            <Text style={styles.btnText}>Call Requester</Text>
          </TouchableOpacity>
        )}

        {!isRequesterView && showDonor && (
          <View style={styles.headerCard}>
            <Text style={styles.title}>Donor Details</Text>
            <Text style={styles.meta}>Name: {donorProfile?.name || '—'}</Text>
            <Text style={styles.meta}>Location: {donorProfile?.location || '—'}</Text>
            <Text style={styles.meta}>Blood Type: {donorProfile?.bloodType || '—'}</Text>
            <Text style={styles.meta}>Email: {donorProfile?.email || '—'}</Text>
            <Text style={styles.meta}>Phone: {donorProfile?.phone || '—'}</Text>
            {donorLoading && (
              <View style={{ marginTop: 8 }}>
                <ActivityIndicator color={semanticColors.interactivePrimary} />
              </View>
            )}
            {donorError && !donorLoading && (
              <Text style={[styles.meta, styles.errorText]}>{donorError}</Text>
            )}
          </View>
        )}

        {!isRequesterView && showDonor && donorProfile?.phone && (
          <TouchableOpacity style={[styles.btn, styles.completeBtn]} onPress={callDonor}>
            <IconSymbol name="phone.fill" size={20} color={semanticColors.textInverse} />
            <Text style={styles.btnText}>Call Now</Text>
          </TouchableOpacity>
        )}
        {!isRequesterView && showDonor && donorProfile?.phone && (
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={whatsappDonor}>
            <IconSymbol name="message.fill" size={20} color={semanticColors.textInverse} />
            <Text style={styles.btnText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

