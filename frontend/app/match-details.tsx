import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function MatchDetails() {
  const params = useLocalSearchParams();
  const payloadStr = (params?.payload as string) || '{}';
  const noti = useMemo(() => { try { return JSON.parse(payloadStr); } catch { return {}; } }, [payloadStr]);
  const [revealed, setRevealed] = useState(false);
  const [donorLoading, setDonorLoading] = useState(false);
  const [donorError, setDonorError] = useState<string | null>(null);
  const [donorInfo, setDonorInfo] = useState<any | null>(null);
  const { user } = useAuth();
  const { isDark } = useTheme();
  const role = (user?.user?.role || '').toLowerCase();

  const patient = noti?.data || {};
  const isEmergency = String(noti?.type || '').toLowerCase() === 'emergency';

  const donorIdFromNoti = String(
    noti?.donorId ||
    noti?.meta?.donorId ||
    patient?.donorId ||
    patient?.meta?.donorId ||
    ''
  );

  const matchIdFromNoti = String(
    noti?.matchId ||
    noti?.meta?.matchId ||
    patient?.matchId ||
    patient?.meta?.matchId ||
    ''
  );

  const requestId = String(
    noti?.requestId ||
    noti?.meta?.requestId ||
    patient?.requestId ||
    patient?.meta?.requestId ||
    patient?.id ||
    patient?._id ||
    ''
  );

  const normalizePhone = (raw: any) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    // keep digits and leading +
    const cleaned = s.replace(/[\s\-()]/g, '');
    return cleaned;
  };

  const openDial = async (rawPhone: any) => {
    const phone = normalizePhone(rawPhone);
    if (!phone) return Alert.alert('Missing phone', 'No phone number is available for this donor.');
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url).catch(() => false);
    if (!can) return Alert.alert('Cannot call', 'Calling is not supported on this device.');
    await Linking.openURL(url);
  };

  const openWhatsApp = async (rawPhone: any) => {
    const phone = normalizePhone(rawPhone);
    if (!phone) return Alert.alert('Missing phone', 'No phone number is available for this donor.');
    const digitsOnly = phone.replace(/^\+/, '');
    const url = `whatsapp://send?phone=${digitsOnly}`;
    const can = await Linking.canOpenURL(url).catch(() => false);
    if (!can) return Alert.alert('WhatsApp not available', 'Install WhatsApp to message this donor.');
    await Linking.openURL(url);
  };

  const fetchMatchedDonor = async () => {
    // Priority resolution for REQUEST_FULFILLED:
    // 1) donorId → fetch donor
    // 2) matchId  → fetch match → extract donorId → fetch donor
    // 3) requestId → fetch request → extract fulfilledBy/matched donor
    // 4) requestId → fallback /matched-donor endpoint
    setDonorLoading(true);
    setDonorError(null);
    setDonorInfo(null);
    try {
      const donorId = donorIdFromNoti && donorIdFromNoti !== 'undefined' ? donorIdFromNoti : '';
      const matchId = matchIdFromNoti && matchIdFromNoti !== 'undefined' ? matchIdFromNoti : '';

      // STEP 1: donorId
      if (donorId) {
        const d: any = await api.getDonorProfile(donorId).catch(() => null) || await api.get(`/api/donors/${encodeURIComponent(donorId)}`).catch(() => null);
        if (d && (d.phone || d.fullName || d.name)) {
          setDonorInfo(d);
          return;
        }
      }

      // STEP 2: matchId
      if (matchId) {
        const mv: any = await api.getRequesterMatchView(matchId).catch(() => null);
        const extracted = mv?.donorId || mv?.donor?._id || mv?.donor?.id || mv?.match?.donorId || mv?.data?.donorId || mv?.data?.donor?._id;
        if (extracted) {
          const d: any = await api.getDonorProfile(String(extracted)).catch(() => null) || await api.get(`/api/donors/${encodeURIComponent(String(extracted))}`).catch(() => null);
          if (d && (d.phone || d.fullName || d.name)) {
            setDonorInfo(d);
            return;
          }
        }
      }

      // STEP 3: requestId → fetch request and inspect fulfilled donor
      if (requestId) {
        const req: any = await api.getRequest(requestId).catch(() => null);
        const donorFromReq = req?.fulfilledBy || req?.donor || req?.donorId || req?.matchedDonorId;
        if (donorFromReq && typeof donorFromReq === 'object') {
          setDonorInfo(donorFromReq);
          return;
        }
        if (donorFromReq) {
          const d: any = await api.getDonorProfile(String(donorFromReq)).catch(() => null) || await api.get(`/api/donors/${encodeURIComponent(String(donorFromReq))}`).catch(() => null);
          if (d && (d.phone || d.fullName || d.name)) {
            setDonorInfo(d);
            return;
          }
        }
      }

      // STEP 4: requestId → fallback /matched-donor endpoint
      if (requestId) {
        const resp: any = await api.get(`/api/requests/${encodeURIComponent(requestId)}/matched-donor`);
        const donor = resp?.donor || resp?.data?.donor || resp;
        if (donor && (donor.phone || donor.fullName || donor.name)) {
          setDonorInfo(donor);
          return;
        }
      }

      setDonorError('Donor details not available yet. Please check again.');
    } catch (e: any) {
      setDonorError('Donor details not available yet. Please check again.');
    } finally {
      setDonorLoading(false);
    }
  };

  const onAcceptDonate = async () => {
    const reqId = patient.requestId || patient.id || patient._id;
    if (reqId) {
      try { if (!isEmergency) await api.acceptRequest(String(reqId)); } catch {}
    }
    setRevealed(true);
  };

  const onContactDonor = async () => {
    setRevealed(true);
    if (role !== 'donor') {
      await fetchMatchedDonor();
    }
  };

  const phoneNum = role === 'donor'
    ? (patient.phone || patient.contactPhone)
    : (donorInfo?.phone || donorInfo?.contactPhone || patient.phone || patient.contactPhone);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt, padding: 16 },
    card: { backgroundColor: semanticColors.bgSurface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle, marginBottom: 16 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: semanticColors.textPrimary, fontWeight: '800' },
    line: { color: semanticColors.textSecondary, marginTop: 6 },
    tag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
    tagTxt: { color: semanticColors.textInverse, fontWeight: '700' },
    tagDonor: { backgroundColor: semanticColors.interactivePrimary },
    tagReq: { backgroundColor: semanticColors.interactiveDanger },
    btn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    btnPrimary: { backgroundColor: semanticColors.interactivePrimary },
    btnAccent: { backgroundColor: semanticColors.interactivePrimaryActive },
    btnCall: { backgroundColor: '#E53935' },
    btnWhats: { backgroundColor: '#E53935' },
    btnTxt: { color: semanticColors.textInverse, fontWeight: '800' },
    err: { color: semanticColors.interactiveDanger, marginBottom: 12 },
  }), [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{role === 'donor' ? 'Patient Details' : 'Donor Details'}</Text>
          <View style={[styles.tag, role === 'donor' ? styles.tagDonor : styles.tagReq]}><Text style={styles.tagTxt}>{role === 'donor' ? 'Donor' : 'Requester'}</Text></View>
        </View>
        {role === 'donor' ? (
          <>
            <Text style={styles.line}>Name: {patient.name || 'Unknown'}</Text>
            <Text style={styles.line}>Blood Type: {patient.bloodType || '—'}</Text>
            <Text style={styles.line}>Location: {patient.location || patient.district || '—'}</Text>
            <Text style={styles.line}>Urgency: {patient.urgencyLevel || patient.urgency || patient.urgentLevel || '—'}</Text>
            {revealed && phoneNum ? <Text style={styles.line}>Phone: {phoneNum}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.line}>Name: {donorInfo?.name || donorInfo?.fullName || '—'}</Text>
            <Text style={styles.line}>Blood Type: {donorInfo?.bloodType || donorInfo?.bloodGroup || '—'}</Text>
            <Text style={styles.line}>Location: {donorInfo?.location || donorInfo?.district || '—'}</Text>
            {revealed ? <Text style={styles.line}>Phone: {phoneNum || '—'}</Text> : null}
          </>
        )}
      </View>

      {donorError ? <Text style={styles.err}>{donorError}</Text> : null}

      {donorLoading ? (
        <ActivityIndicator style={{ marginBottom: 12 }} color={semanticColors.interactivePrimary} />
      ) : null}

      {role === 'donor' ? (
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onAcceptDonate}>
          <Text style={styles.btnTxt}>{isEmergency ? 'Show Contact' : 'Accept & Donate'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.btn, styles.btnAccent]} onPress={onContactDonor}>
          <Text style={styles.btnTxt}>View Donor</Text>
        </TouchableOpacity>
      )}

      {/* Always show action buttons for requester; show alerts if phone missing */}
      {role !== 'donor' ? (
        <>
          <TouchableOpacity style={[styles.btn, styles.btnCall]} onPress={() => openDial(phoneNum)}>
            <Text style={styles.btnTxt}>Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnWhats]} onPress={() => openWhatsApp(phoneNum)}>
            <Text style={styles.btnTxt}>Whasapp</Text>
          </TouchableOpacity>
        </>
      ) : (
        revealed && phoneNum ? (
          <TouchableOpacity style={[styles.btn, styles.btnCall]} onPress={() => openDial(phoneNum)}>
            <Text style={styles.btnTxt}>Call Now</Text>
          </TouchableOpacity>
        ) : null
      )}

      {role === 'donor' && (patient.requestId || patient._id) ? (
        <TouchableOpacity style={[styles.btn, styles.btnAccent]} onPress={async () => { try { await api.markDonated(String(patient.requestId || patient._id)); } catch {} }}>
          <Text style={styles.btnTxt}>I Have Donated</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

