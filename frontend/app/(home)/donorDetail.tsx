import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import apiClient from '@/service/api';

function normalizePhone(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^+\d]/g, '');
  // If no plus and looks like local (starts with 0), keep as is; otherwise return digits
  return digits;
}

export default function DonorDetail() {
  const params = useLocalSearchParams();
  const { isDark } = useTheme();
  const id = params.id ? String(params.id) : '';
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  // derive from params initially
  const fallback = {
    name: String(params.name || 'Donor'),
    bloodType: String(params.bloodType || ''),
    location: String(params.location || ''),
    availability: String(params.availability || '').toLowerCase() === 'true',
    phone: String(params.phone || ''),
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
  const data = await apiClient.getDonorProfile(id);
        if (mounted) setProfile(data);
      } catch (e: any) {
        // Keep fallback params if fetch fails
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [id]);

  const name = (
    profile?.fullName || profile?.name || fallback.name
  ) as string;
  const bloodType = (
    profile?.bloodGroup || profile?.bloodType || fallback.bloodType
  ) as string;
  const location = (
    profile?.district || profile?.location || fallback.location
  ) as string;
  const availability = Boolean(
    (profile?.availabilityStatus ? String(profile.availabilityStatus).toLowerCase() === 'available' : profile?.availability) ?? fallback.availability
  );
  const phoneRaw = (profile?.phone ?? fallback.phone) as string;
  const phone = useMemo(() => normalizePhone(phoneRaw), [phoneRaw]);

  const handleContact = async () => {
    if (!phone) {
      Alert.alert('No phone number', 'This donor has no phone number available.');
      return;
    }
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Cannot open dialer', 'Your device cannot open the phone dialer.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Failed to open dialer', 'Please try again or copy the number manually.');
    }
  };

  const handleMessage = async () => {
    if (!phone) { Alert.alert('No phone number'); return; }
    const url = `sms:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (!can) { Alert.alert('Cannot open messages app'); return; }
    try { await Linking.openURL(url); } catch {}
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {Platform.OS === 'ios' && (
        <Stack.Screen options={{ title: 'Donor Details' }} />
      )}
      <View style={s.card}>
        <Text style={s.title}>{name}</Text>
        {!!bloodType && <Text style={s.row}>Blood group: <Text style={s.value}>{bloodType}</Text></Text>}
        {!!location && <Text style={s.row}>District: <Text style={s.value}>{location}</Text></Text>}
        <Text style={s.row}>Availability: <Text style={[s.value, { color: availability ? colors.success : colors.textSecondary }]}>{availability ? 'Available' : 'Unavailable'}</Text></Text>
        {!!phone && <Text style={s.row}>Phone: <Text style={s.value}>{phone}</Text></Text>}
        {loading && (
          <View style={{ marginTop: 12 }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        <View style={s.rowButtons}>
          <TouchableOpacity style={[s.button, !phone && s.buttonDisabled]} onPress={handleContact} disabled={!phone}>
            <Text style={[s.buttonText, { color: semanticColors.textInverse }]}>Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.buttonSecondary, !phone && s.buttonSecondaryDisabled]} onPress={handleMessage} disabled={!phone}>
            <Text style={s.buttonSecondaryText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  row: { fontSize: 16, color: colors.text, marginTop: 6 },
  value: { fontWeight: '600', color: colors.text },
  rowButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { fontWeight: '700', fontSize: 16 },
  buttonSecondary: { flex: 1, backgroundColor: colors.card, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  buttonSecondaryDisabled: { opacity: 0.6 },
  buttonSecondaryText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
