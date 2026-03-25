import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import colorsBase, { semanticColors, spacing, typography, elevation, radii } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api, { Donor } from "../service/api";
import useAuth from '@/hooks/useAuth';
import SelectField from '../components/SelectField';
import { LOCATIONS as STD_LOCATIONS } from '@/constants/locations';
import HeaderBanner from '@/components/HeaderBanner';

export default function EmergencyRequest() {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
  const role = String(user?.user?.role || '').toLowerCase();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const defaultBloodTypes = useMemo(() => ['A+','A-','B+','B-','AB+','AB-','O+','O-'], []);
  const [bloodTypes, setBloodTypes] = useState<string[]>(defaultBloodTypes);
  // Use static Banaadir districts as baseline; merge backend meta if present.
  // Standardized locations
  const [locations, setLocations] = useState<string[]>(STD_LOCATIONS);

  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed detailed emergency form controls to simplify UI per request

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
        // Do not filter by availability; show both and label clearly
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
        // Enforce standardized locations list; ignore backend variants
      } catch (e) {
        // Keep empty lists on failure; user can still type & search by q
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-search as users adjust filters or right after screen opens
  useEffect(() => {
    const timeout = setTimeout(() => { fetchDonors(); }, 250);
    return () => clearTimeout(timeout);
    // Trigger on query and filter changes
  }, [searchQuery, selectedBloodType, selectedLocation]);

  const availableDonors = donors.filter(d => !!d.availability);
  const unavailableDonors = donors.filter(d => !d.availability);

  const styles = useMemo(() => {
    const softAccent = isDark ? semanticColors.bgElevated : colorsBase.palette.brandSoft;
    const badgeBorder = isDark ? semanticColors.borderSubtle : colorsBase.palette.dangerLight;

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: semanticColors.bgAlt,
      },
      headerBannerWrap: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.md,
      },
      heroTitle: {
        ...typography.h2,
        fontWeight: '700',
        color: semanticColors.textInverse,
        marginBottom: spacing.sm,
        letterSpacing: -0.3,
      },
      heroSubtitle: {
        ...typography.bodySmall,
        color: semanticColors.textInverse,
        opacity: 0.95,
        fontWeight: '500',
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: semanticColors.borderSubtle,
        backgroundColor: semanticColors.bgElevated,
      },
      backButton: {
        padding: 8,
      },
      headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: semanticColors.textPrimary,
      },
      placeholder: {
        width: 40,
      },
      emergencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      emergencyContent: {
        marginLeft: 12,
        flex: 1,
      },
      emergencyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: semanticColors.textInverse,
        marginBottom: 4,
      },
      emergencyText: {
        fontSize: 14,
        color: semanticColors.textInverse,
        opacity: 0.9,
      },
      filterContainer: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
        marginHorizontal: spacing.lg,
        backgroundColor: semanticColors.bgSurface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: semanticColors.borderSubtle,
        paddingVertical: spacing.lg,
      },
      fieldLabel: {
        ...typography.label,
        fontWeight: '600',
        color: semanticColors.textPrimary,
        marginBottom: spacing.sm,
        marginTop: spacing.xs,
      },
      dropdown: {
        backgroundColor: semanticColors.bgSurface,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: semanticColors.borderSubtle,
        marginBottom: spacing.md,
      },
      dropdownText: {
        ...typography.body,
        color: semanticColors.textPrimary,
        fontWeight: '500',
      },
      placeholderText: {
        color: semanticColors.textSecondary,
      },
      clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: softAccent,
        marginTop: 8,
        borderWidth: 1,
        borderColor: semanticColors.borderSubtle,
      },
      clearFiltersText: {
        fontSize: 14,
        color: semanticColors.textSecondary,
        marginLeft: 6,
      },
      searchBar: {
        backgroundColor: semanticColors.bgSurface,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: semanticColors.borderSubtle,
      },
      searchInput: {
        flex: 1,
        ...typography.body,
        color: semanticColors.textPrimary,
        marginLeft: spacing.md,
      },
      rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
      // Action buttons removed visually; search auto-triggers on filter changes
      donorsList: {
        flex: 1,
      },
      donorsContent: {
        paddingHorizontal: spacing.lg,
      },
      sectionTitle: {
        ...typography.h3,
        fontWeight: '700',
        color: semanticColors.textPrimary,
        marginTop: spacing.md,
        marginBottom: spacing.md,
        textAlign: 'center',
        letterSpacing: -0.2,
      },
      donorCard: {
        backgroundColor: semanticColors.bgSurface,
        borderRadius: radii.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 0,
        ...elevation.sm,
      },
      donorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
      },
      donorAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: softAccent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        borderWidth: 0,
      },
      donorDetails: {
        flex: 1,
      },
      donorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
      },
      donorName: {
        ...typography.h4,
        fontWeight: '800',
        color: semanticColors.textPrimary,
        flex: 1,
      },
      bloodTypeBadge: {
        backgroundColor: 'transparent',
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: badgeBorder,
        minWidth: 44,
        alignItems: 'center',
      },
      bloodTypeText: {
        color: semanticColors.textPrimary,
        ...typography.labelSmall,
        fontWeight: '800',
      },
      donorMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 2,
        columnGap: 14,
        rowGap: 6,
      },
      metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      metaText: {
        ...typography.caption,
        color: semanticColors.textSecondary,
        marginLeft: spacing.xs,
      },
      distanceText: {
        ...typography.caption,
        color: semanticColors.textSecondary,
      },
      contactButton: {
        backgroundColor: colorsBase.palette.brandSoft,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: radii.md,
        borderWidth: 0,
      },
      contactButtonDisabled: {
        backgroundColor: semanticColors.bgAlt,
        borderWidth: 1,
        borderColor: semanticColors.borderSubtle,
        opacity: 1,
      },
      contactButtonText: {
        color: semanticColors.textPrimary,
        ...typography.label,
        fontWeight: '800',
      },
      contactButtonTextDisabled: {
        color: semanticColors.textSecondary,
      },
      emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
      },
      emptyStateText: {
        ...typography.h4,
        fontWeight: '600',
        color: semanticColors.textPrimary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      },
      emptyStateSubtext: {
        ...typography.bodySmall,
        color: semanticColors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      },
      modalContent: {
        backgroundColor: semanticColors.bgSurface,
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
        borderBottomColor: semanticColors.borderSubtle,
      },
      modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: semanticColors.textPrimary,
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
        borderBottomColor: semanticColors.borderSubtle,
      },
      selectedItem: {
        backgroundColor: softAccent,
      },
      modalItemText: {
        fontSize: 16,
        color: semanticColors.textPrimary,
      },
      selectedItemText: {
        color: semanticColors.interactivePrimary,
        fontWeight: '600',
      },
    });
  }, [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={semanticColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Request</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Unified Banner */}
      <HeaderBanner style={styles.headerBannerWrap}>
        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyContent}>
            <Text style={styles.heroTitle}>Emergency</Text>
            <Text style={styles.heroSubtitle}>Find donors immediately</Text>
          </View>
        </View>
      </HeaderBanner>

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

        {/* Search bar removed per design request; auto-search remains active */}

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
            <IconSymbol name="xmark.circle.fill" size={16} color={semanticColors.textSecondary} />
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Emergency Form Controls removed */}

      {/* Manual Search/Emergency buttons removed visually; search auto-triggers */}

      {/* Donors List */}
      <ScrollView 
        style={styles.donorsList}
        contentContainerStyle={styles.donorsContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Available Donors</Text>
        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <ActivityIndicator color={semanticColors.interactivePrimary} />
          </View>
        )}

        {availableDonors.map((donor) => (
          <View key={donor._id} style={styles.donorCard}>
            <View style={styles.donorInfo}>
              <View style={styles.donorAvatar}>
                <IconSymbol name="drop.fill" size={18} color={colorsBase.palette.brand} />
              </View>
              
              <View style={styles.donorDetails}>
                <View style={styles.donorHeader}>
                  <Text style={styles.donorName}>{donor.name}</Text>
                </View>
                
                <View style={styles.donorMeta}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="location.fill" size={14} color={semanticColors.textSecondary} />
                    <Text style={styles.metaText}>{donor.location || 'Unknown'}</Text>
                  </View>
                  {!!donor.phone && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="phone.fill" size={14} color={semanticColors.textSecondary} />
                      <Text style={styles.metaText}>{donor.phone}</Text>
                    </View>
                  )}
                </View>
                
                {/* Could compute distance later if we collect coordinates */}
                {/* <Text style={styles.distanceText}>{donor.distance} away</Text> */}
              </View>
            </View>
            
            <View style={styles.rightActions}>
              <View style={styles.bloodTypeBadge}>
                <Text style={styles.bloodTypeText}>{donor.bloodType}</Text>
              </View>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleContact(donor)}
              >
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {/* Unavailable donors section */}
        {unavailableDonors.length > 0 && <Text style={styles.sectionTitle}>Unavailable Donors</Text>}
        {unavailableDonors.map((donor) => (
          <View key={donor._id} style={styles.donorCard}>
            <View style={styles.donorInfo}>
              <View style={styles.donorAvatar}>
                <IconSymbol name="drop.fill" size={18} color={colorsBase.palette.brand} />
              </View>
              <View style={styles.donorDetails}>
                <View style={styles.donorHeader}>
                  <Text style={styles.donorName}>{donor.name}</Text>
                </View>
                <View style={styles.donorMeta}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="location.fill" size={14} color={semanticColors.textSecondary} />
                    <Text style={styles.metaText}>{donor.location || 'Unknown'}</Text>
                  </View>
                  {!!donor.phone && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="phone.fill" size={14} color={semanticColors.textSecondary} />
                      <Text style={styles.metaText}>{donor.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.rightActions}>
              <View style={styles.bloodTypeBadge}>
                <Text style={styles.bloodTypeText}>{donor.bloodType}</Text>
              </View>
              <View style={[styles.contactButton, styles.contactButtonDisabled]}>
                <Text style={[styles.contactButtonText, styles.contactButtonTextDisabled]}>Unavailable</Text>
              </View>
            </View>
          </View>
        ))}

        {!loading && availableDonors.length === 0 && unavailableDonors.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="person.slash" size={48} color={semanticColors.textSecondary} />
            <Text style={styles.emptyStateText}>No donors found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your search criteria</Text>
          </View>
        )}
      </ScrollView>

      {/* Removed platform ActionSheets in favor of consistent modal SelectField */}
    </SafeAreaView>
  );
}
