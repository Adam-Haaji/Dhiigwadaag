import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import api, { Donor } from '../../service/api';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '@/styles/commonStyles';

export default function SearchDonor() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Donor[]>([]);

  const normalizePhone = (raw?: string) => (raw ? raw.replace(/[^+\d]/g, '') : '');
  const contactDonor = async (phone?: string) => {
    const tel = normalizePhone(phone);
    if (!tel) {
      Alert.alert('No phone', 'This donor has no phone number available.');
      return;
    }
    const url = `tel:${tel}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Cannot open dialer', 'Your device cannot open the phone dialer.');
      return;
    }
    try { await Linking.openURL(url); } catch { Alert.alert('Failed', 'Could not open dialer.'); }
  };

  const doSearchUnified = async () => {
    setError(null); setLoading(true);
    try {
      const data: Donor[] = await api.searchDonors({ q: query.trim() || undefined, availability: true });
      setResults(data);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { doSearchUnified(); }, []);
  useFocusEffect(React.useCallback(() => {
    doSearchUnified();
    return () => {};
  }, [query]));

  return (
    <SafeAreaView style={s.container}>
      {Platform.OS === 'ios' && (
        <Stack.Screen options={{ title: 'Search Donors' }} />
      )}
      <Text style={s.title}>Search Donors</Text>
      <View style={s.filters}>
        <TextInput
          style={s.input}
          placeholder="Search by blood type (e.g., O+) or location/name/phone"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={s.button} onPress={doSearchUnified} disabled={loading}>
          <Text style={s.buttonText}>{loading ? 'Searching...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>

      {/* Placeholder for map preview - can integrate react-native-maps later */}
      <View style={s.mapPreview}>
        <Text style={s.mapText}>Map preview (coming soon)</Text>
      </View>

      {error && <Text style={s.error}>{error}</Text>}
      {/* Removed API base URL display for security (was shown in devTip) */}
      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={s.cardRow}>
            <TouchableOpacity
              style={[s.card, { flex: 1 }]}
              onPress={() => {
                router.push({
                  pathname: '/(home)/donorDetail',
                  params: {
                    id: item._id,
                    name: item.name,
                    bloodType: item.bloodType,
                    location: item.location,
                    phone: item.phone,
                    availability: String(!!item.availability),
                  },
                });
              }}
            >
              <Text style={s.name}>{item.name} • {item.bloodType}</Text>
              <Text style={s.meta}>{item.location} • {item.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.contactBtn} onPress={() => contactDonor(item.phone)}>
              <Text style={s.contactText}>Contact</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>No donors found</Text> : null}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text },
  filters: { gap: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.card, color: colors.text },
  button: { backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  mapPreview: { height: 120, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, marginBottom: 12 },
  mapText: { color: colors.textSecondary },
  error: { color: '#E74C3C', marginBottom: 8 },
  // devTip removed: no longer exposing internal API details
  cardRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  card: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.textSecondary, marginTop: 4 },
  contactBtn: { backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'center', height: 40, justifyContent: 'center' },
  contactText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 },
});
