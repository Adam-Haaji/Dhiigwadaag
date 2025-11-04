
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import api, { Donor } from "../service/api";
import SelectField from '../components/SelectField';

export default function EmergencyRequest() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const defaultBloodTypes = useMemo(() => ['A+','A-','B+','B-','AB+','AB-','O+','O-'], []);
  const [bloodTypes, setBloodTypes] = useState<string[]>(defaultBloodTypes);
  // Use static Banaadir districts as baseline; merge backend meta if present.
  const banaadirDistricts = useMemo(() => [
    'Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley', 'Hamar Jajab', 'Hamar Weyne', 'Hodan',
    'Howlwadaag', 'Kaaran', 'Shangani', 'Shibis', 'Wadajir (Medina)', 'Waberi',
    'Wardhiigley (Warta Nabadda)', 'Yaqshid', 'Garasbaley', 'Kahda',
  ], []);
  const [locations, setLocations] = useState<string[]>(banaadirDistricts);

  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleContact = async (donor: Donor) => {
    if (!donor.availability) return;
    if (!donor.phone) {
      setError('No phone number available for this donor.');
      return;
    }
    try {
      await Linking.openURL(`tel:${donor.phone}`);
    } catch (e) {
      setError('Unable to open dialer.');
    }
  };

  const fetchDonors = async () => {
    setError(null);
    setLoading(true);
    try {
      const result: Donor[] = await api.searchDonors({
        q: searchQuery.trim() || undefined,
        bloodType: selectedBloodType || undefined,
        city: selectedLocation || undefined,
        // include both availability states so user can see disabled contacts too
      });
      setDonors(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load donors');
    } finally {
      setLoading(false);
    }
  };

  // Load selectable options dynamically from backend and merge
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meta: any = await api.donorsMeta();
        if (cancelled) return;
        const bt = Array.isArray(meta?.bloodTypes) ? meta.bloodTypes : [];
        const locs = Array.isArray(meta?.locations) ? meta.locations : [];
        if (bt.length) {
          // Merge backend-provided types with the defaults
          setBloodTypes(Array.from(new Set([...defaultBloodTypes, ...bt])));
        }
        if (locs.length) {
          // Merge backend locations with static list, ensuring uniqueness
          const merged = Array.from(new Set([...banaadirDistricts, ...locs]));
          setLocations(merged);
        }
      } catch (e) {
        // Keep empty lists on failure; user can still type & search by q
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredDonors = donors; // server already filters; keep placeholder if client-side tweaks are needed

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Request</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header Card (visual design only) */}
      <View style={styles.headerCard}>
        <Text style={styles.heroTitle}>Emergency</Text>
        <Text style={styles.heroSubtitle}>Find donors immediately</Text>
      </View>

      {/* Filter Form */}
      <View style={styles.filterContainer}>
        {/* Blood Type Dropdown */}
        <Text style={styles.fieldLabel}></Text>
        <SelectField
          label="Blood Type"
          placeholder="Select Blood Type"
          value={selectedBloodType || null}
          options={bloodTypes.map(v => ({ label: v, value: v }))}
          onChange={(v: string) => setSelectedBloodType(v)}
        />

        {/* Location Dropdown */}
        <Text style={styles.fieldLabel}></Text>
        <SelectField
          label="Location"
          placeholder="Select Location"
          value={selectedLocation || null}
          options={locations.map(v => ({ label: v, value: v }))}
          onChange={(v: string) => setSelectedLocation(v)}
        />

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search donors"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Clear Filters Button */}
        {(selectedBloodType || selectedLocation || searchQuery) && (
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={() => {
              setSelectedBloodType('');
              setSelectedLocation('');
              setSearchQuery('');
            }}
          >
            <IconSymbol name="xmark.circle.fill" size={16} color={colors.textSecondary} />
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.searchButton} onPress={fetchDonors} disabled={loading}>
          <IconSymbol name="magnifyingglass" size={20} color="#FFFFFF" />
          <Text style={styles.searchButtonText}>{loading ? 'Searching…' : 'Search'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.emergencyCallButton} onPress={async () => {
          try {
            if (!selectedBloodType && !selectedLocation) {
              // Still allow broadcast to all if nothing selected, but better to prompt
            }
            await api.emergency({ bloodType: selectedBloodType || undefined, location: selectedLocation || undefined, message: 'Emergency broadcast' });
            // Optionally navigate to notifications
            router.push('/(home)/notification');
          } catch (e: any) {
            console.warn('Emergency failed', e?.message);
          }
        }}>
          <IconSymbol name="phone.fill" size={20} color="#FFFFFF" />
          <Text style={styles.emergencyCallText}>Emergency Call</Text>
        </TouchableOpacity>
      </View>

      {/* Donors List */}
      <ScrollView 
        style={styles.donorsList}
        contentContainerStyle={styles.donorsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.sectionTitle}>Available Donors ({filteredDonors.length})</Text>
          {loading && <ActivityIndicator color={colors.primary} />}
        </View>
        
        {filteredDonors.map((donor) => (
          <View key={donor._id} style={styles.donorCard}>
            <View style={styles.donorInfo}>
              <View style={styles.donorAvatar}>
                <Text style={styles.donorAvatarText}>🩸</Text>
              </View>
              
              <View style={styles.donorDetails}>
                <View style={styles.donorHeader}>
                  <Text style={styles.donorName}>{donor.name}</Text>
                  <View style={styles.bloodTypeBadge}>
                    <Text style={styles.bloodTypeText}>{donor.bloodType}</Text>
                  </View>
                </View>
                
                <View style={styles.donorMeta}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{donor.location || 'Unknown'}</Text>
                  </View>
                  {!!donor.phone && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="phone.fill" size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{donor.phone}</Text>
                    </View>
                  )}
                </View>
                
                {/* Could compute distance later if we collect coordinates */}
                {/* <Text style={styles.distanceText}>{donor.distance} away</Text> */}
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.contactButton,
                !donor.availability && styles.contactButtonDisabled
              ]}
              onPress={() => handleContact(donor)}
              disabled={!donor.availability}
            >
              <Text style={[
                styles.contactButtonText,
                !donor.availability && styles.contactButtonTextDisabled
              ]}>
                {donor.availability ? 'Contact' : 'Unavailable'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        
        {!loading && filteredDonors.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="person.slash" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No donors found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your search criteria</Text>
          </View>
        )}
      </ScrollView>

      {/* Removed platform ActionSheets in favor of consistent modal SelectField */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.error,
    margin: 20,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#FFE9EF',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  emergencyBanner: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    margin: 20,
    borderRadius: 12,
  },
  emergencyContent: {
    marginLeft: 12,
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  // removed profileHint as we no longer auto-fill from profile
  dropdown: {
    backgroundColor: colors.card,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.highlight,
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  searchBar: {
    backgroundColor: colors.card,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  createRequestButton: {
    backgroundColor: colors.secondary,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  createRequestText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emergencyCallButton: {
    backgroundColor: colors.error,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  emergencyCallText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: colors.primary,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  donorsList: {
    flex: 1,
  },
  donorsContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  donorCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  donorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  donorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donorAvatarText: {
    fontSize: 24,
  },
  donorDetails: {
    flex: 1,
  },
  donorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  bloodTypeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bloodTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  donorMeta: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  contactButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactButtonDisabled: {
    backgroundColor: colors.grey,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contactButtonTextDisabled: {
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedItem: {
    backgroundColor: colors.highlight,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  selectedItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
