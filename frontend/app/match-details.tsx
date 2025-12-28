import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function MatchDetails() {
  const params = useLocalSearchParams();
  const payloadStr = (params?.payload as string) || '{}';
  const noti = useMemo(() => { try { return JSON.parse(payloadStr); } catch { return {}; } }, [payloadStr]);
  const [revealed, setRevealed] = useState(false);
  const { user } = useAuth();
  const role = (user?.user?.role || '').toLowerCase();

  const patient = noti?.data || {};
  const isEmergency = String(noti?.type || '').toLowerCase() === 'emergency';

  const onAcceptDonate = async () => {
    const reqId = patient.requestId || patient.id || patient._id;
    if (reqId) {
      try { if (!isEmergency) await api.acceptRequest(String(reqId)); } catch {}
    }
    setRevealed(true);
  };

  const onContactDonor = () => {
    setRevealed(true);
  };

  const phoneNum = patient.phone || patient.contactPhone;
  const openDial = () => { if (phoneNum) Linking.openURL(`tel:${phoneNum}`); };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.title}>{role === 'donor' ? 'Patient Details' : 'Donor Details'}</Text>
          <View style={[s.tag, role === 'donor' ? s.tagDonor : s.tagReq]}><Text style={s.tagTxt}>{role === 'donor' ? 'Donor' : 'Requester'}</Text></View>
        </View>
        <Text style={s.line}>Name: {patient.name || 'Unknown'}</Text>
        <Text style={s.line}>Blood Type: {patient.bloodType || '—'}</Text>
        <Text style={s.line}>Location: {patient.location || patient.district || '—'}</Text>
        <Text style={s.line}>Urgency: {patient.urgencyLevel || patient.urgency || patient.urgentLevel || '—'}</Text>
        {revealed && phoneNum ? <Text style={s.line}>Phone: {phoneNum}</Text> : null}
      </View>

      {role === 'donor' ? (
        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={onAcceptDonate}>
          <Text style={s.btnTxt}>{isEmergency ? 'Show Contact' : 'Accept & Donate'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[s.btn, s.btnAccent]} onPress={onContactDonor}>
          <Text style={s.btnTxt}>Contact Donor</Text>
        </TouchableOpacity>
      )}

      {revealed && phoneNum ? (
        <TouchableOpacity style={[s.btn, s.btnCall]} onPress={openDial}>
          <Text style={s.btnTxt}>Call Now</Text>
        </TouchableOpacity>
      ) : null}

      {role === 'donor' && (patient.requestId || patient._id) ? (
        <TouchableOpacity style={[s.btn, s.btnAccent]} onPress={async () => { try { await api.markDonated(String(patient.requestId || patient._id)); } catch {} }}>
          <Text style={s.btnTxt}>I Have Donated</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontWeight: '800' },
  line: { color: colors.textSecondary, marginTop: 6 },
  tag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  tagTxt: { color: '#fff', fontWeight: '700' },
  tagDonor: { backgroundColor: colors.primary },
  tagReq: { backgroundColor: '#E53935' },
  btn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnPrimary: { backgroundColor: colors.primary },
  btnAccent: { backgroundColor: '#4527A0' },
  btnCall: { backgroundColor: '#2E7D32' },
  btnTxt: { color: '#fff', fontWeight: '800' },
});
