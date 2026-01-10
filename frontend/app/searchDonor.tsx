import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { Donor } from '../service/api';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import colorsBase, { semanticColors } from '@/constants/colors';

export default function SearchDonor() {
  const params = useLocalSearchParams<{ bloodType?: string; city?: string }>();
  const { isDark } = useTheme();
  const [bloodType, setBloodType] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsExact, setResultsExact] = useState<Donor[]>([]);
  const [resultsCompat, setResultsCompat] = useState<Donor[]>([]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, padding: 16, backgroundColor: semanticColors.bgAlt },
        title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: semanticColors.textPrimary },
        filters: { gap: 8, marginBottom: 12 },
        input: {
          borderWidth: 1,
          borderColor: semanticColors.borderSubtle,
          borderRadius: 8,
          padding: 12,
          backgroundColor: semanticColors.bgSurface,
          color: semanticColors.textPrimary,
        },
        button: { backgroundColor: semanticColors.interactivePrimary, padding: 12, borderRadius: 8, alignItems: 'center' },
        buttonText: { color: semanticColors.textInverse, fontWeight: '700' },
        error: { color: semanticColors.interactiveDanger, marginBottom: 8 },
        card: {
          backgroundColor: semanticColors.bgSurface,
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: semanticColors.borderSubtle,
        },
        name: { fontSize: 16, fontWeight: '700', color: semanticColors.textPrimary },
        meta: { color: semanticColors.textSecondary, marginTop: 4 },
        empty: { textAlign: 'center', color: semanticColors.textSecondary, marginTop: 20 },
        sectionTitle: { fontSize: 14, fontWeight: '800', color: semanticColors.textPrimary, marginTop: 8, marginBottom: 8 },
        badgePerfect: { color: colorsBase.palette.success, fontWeight: '800' },
        perfect: { color: colorsBase.palette.success, fontWeight: '700' },
        compat: { color: colorsBase.palette.warning, fontWeight: '700' },
      }),
    [isDark]
  );

  const doSearch = async () => {
    setError(null); setLoading(true);
    try {
      if (bloodType) {
        const resp = await api.matchByBlood({ type: bloodType, district: city || undefined });
        const mapTo = (d: any): Donor => ({
          _id: String(d.id || ''),
          name: d.name || '',
          email: '',
          bloodType: d.bloodType,
          location: d.district || '',
          phone: '',
          availability: true,
        });
        setResultsExact(Array.isArray(resp?.exactMatches) ? resp.exactMatches.map(mapTo) : []);
        setResultsCompat(Array.isArray(resp?.compatibleMatches) ? resp.compatibleMatches.map(mapTo) : []);
      } else {
        const data = await api.searchDonors({ bloodType: undefined, city: city || undefined, availability: true });
        setResultsExact(data);
        setResultsCompat([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Initialize from route params then search
  useEffect(() => {
    if (params?.bloodType) setBloodType(String(params.bloodType));
    if (params?.city) setCity(String(params.city));
  }, [params?.bloodType, params?.city]);

  useEffect(() => { doSearch(); }, [bloodType, city]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Text style={styles.title}>Find Donors</Text>
      <View style={styles.filters}>
        <TextInput
          style={styles.input}
          placeholder="Blood Type (e.g. O+)"
          placeholderTextColor={semanticColors.textMuted}
          value={bloodType}
          onChangeText={setBloodType}
        />
        <TextInput
          style={styles.input}
          placeholder="City"
          placeholderTextColor={semanticColors.textMuted}
          value={city}
          onChangeText={setCity}
        />
        <TouchableOpacity style={styles.button} onPress={doSearch} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Searching...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.sectionTitle}>Exact Matches <Text style={styles.badgePerfect}>Perfect Match</Text></Text>
      <FlatList
        data={resultsExact}
        keyExtractor={(item) => item._id + '-e'}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.name}>{item.name || 'Donor'} • {item.bloodType}</Text>
              <Text style={styles.perfect}>{item.bloodType === 'O-' ? 'Universal Donor' : 'Perfect Match'}</Text>
            </View>
            <Text style={styles.meta}>{item.location || '—'}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No exact matches</Text> : null}
      />

      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Also Compatible</Text>
      <FlatList
        data={resultsCompat}
        keyExtractor={(item) => item._id + '-c'}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.name}>{item.name || 'Donor'} • {item.bloodType}</Text>
              <Text style={styles.compat}>{item.bloodType === 'O-' ? 'Universal Donor' : 'Compatible'}</Text>
            </View>
            <Text style={styles.meta}>{item.location || '—'}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No compatible donors</Text> : null}
      />
    </SafeAreaView>
  );
}
