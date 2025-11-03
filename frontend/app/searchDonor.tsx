import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { Donor } from '../service/api';

export default function SearchDonor() {
  const [bloodType, setBloodType] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Donor[]>([]);

  const doSearch = async () => {
    setError(null); setLoading(true);
    try {
      const data = await api.searchDonors({ bloodType: bloodType || undefined, city: city || undefined, availability: true });
      setResults(data);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { doSearch(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Find Donors</Text>
      <View style={styles.filters}>
        <TextInput style={styles.input} placeholder="Blood Type (e.g. O+)" value={bloodType} onChangeText={setBloodType} />
        <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
        <TouchableOpacity style={styles.button} onPress={doSearch} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Searching...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name} • {item.bloodType}</Text>
            <Text style={styles.meta}>{item.location} • {item.phone}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No donors found</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  filters: { gap: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  button: { backgroundColor: '#e53935', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#E74C3C', marginBottom: 8 },
  card: { backgroundColor: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#555', marginTop: 4 },
  empty: { textAlign: 'center', color: '#555', marginTop: 20 },
});
