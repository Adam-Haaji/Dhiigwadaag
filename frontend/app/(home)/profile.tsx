import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Switch, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import apiClient from "../../service/api";
import * as ImagePicker from 'expo-image-picker';
import useAuthHook from "../../hooks/useAuth";
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';
import HeaderBanner from '@/components/HeaderBanner';


export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<any>({});
  const [donorProfile, setDonorProfile] = useState<any>(null);
  const { logout } = useAuthHook();
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const { isDark } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semanticColors.bgAlt,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    scrollContentWithTabBar: {
      paddingBottom: 100,
    },
    headerBannerWrap: {
      alignSelf: 'center',
      width: '92%',
      marginBottom: 16,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerTitle: { color: semanticColors.textInverse, fontSize: 20, fontWeight: '800' },
    headerSubtitle: { color: semanticColors.textInverse, fontSize: 13, fontWeight: '500', marginTop: 2 },
    profileHeader: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: semanticColors.interactivePrimary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: semanticColors.interactivePrimary,
    },
    avatarText: {
      fontSize: 36,
      fontWeight: '700',
      color: semanticColors.textInverse,
    },
    editAvatarButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: semanticColors.interactivePrimaryActive,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: semanticColors.bgSurface,
    },
    name: {
      fontSize: 24,
      fontWeight: '700',
      color: semanticColors.textPrimary,
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      color: semanticColors.textSecondary,
      marginBottom: 16,
    },
    bloodTypeContainer: {
      alignItems: 'center',
    },
    bloodTypeBadge: {
      backgroundColor: semanticColors.interactivePrimary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    bloodTypeText: {
      color: semanticColors.textInverse,
      fontSize: 18,
      fontWeight: '700',
      marginLeft: 8,
    },
    availabilityCard: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    availabilityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    availabilityInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    availabilityText: {
      marginLeft: 12,
      flex: 1,
    },
    availabilityTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: semanticColors.textPrimary,
      marginBottom: 4,
    },
    availabilitySubtitle: {
      fontSize: 14,
      color: semanticColors.textSecondary,
    },
    infoCard: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: semanticColors.textPrimary,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: semanticColors.borderSubtle,
    },
    infoContent: {
      marginLeft: 16,
      flex: 1,
    },
    infoLabel: {
      fontSize: 14,
      color: semanticColors.textSecondary,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '500',
      color: semanticColors.textPrimary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: semanticColors.interactivePrimary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: semanticColors.textSecondary,
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 12,
    },
    primaryButton: {
      backgroundColor: semanticColors.interactivePrimary,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    primaryButtonText: {
      color: semanticColors.textInverse,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    secondaryButton: {
      backgroundColor: semanticColors.bgSurface,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
    },
    secondaryButtonText: {
      color: semanticColors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    logoutButton: {
      backgroundColor: semanticColors.bgSurface,
      borderWidth: 1,
      borderColor: semanticColors.interactiveDanger,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
    },
    logoutButtonText: {
      color: semanticColors.interactiveDanger,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
  }), [isDark]);

  useEffect(() => {
    (async () => {
      try {
        const me = await apiClient.me();
        setUserProfile(me || {});
        
        // Load donor profile if user is a donor
        try {
          const donorData = await apiClient.donorMe();
          if (donorData?.exists && donorData?.donor) {
            setDonorProfile(donorData.donor);
            // Merge donor data with user profile for display
            setUserProfile((prev: any) => ({
              ...prev,
              // Override with donor data if available
              bloodType: donorData.donor.bloodGroup || prev.bloodType,
              phone: donorData.donor.phone || prev.phone,
              email: donorData.donor.email || prev.email,
              location: donorData.donor.district || prev.location,
            }));
          }
        } catch (e) {
          // Not a donor or error loading donor data - use user data only
        }
      } catch {}
    })();
  }, []);

  const handleEditProfile = () => {
    router.push('/editProfile');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const donorAvailabilityStatus = String(donorProfile?.availabilityStatus || '').toLowerCase();
  const hasDonorAvailability = donorAvailabilityStatus === 'available' || donorAvailabilityStatus === 'unavailable';
  const isAvailable = hasDonorAvailability
    ? donorAvailabilityStatus === 'available'
    : !!userProfile?.availability;

  const cooldownUntilRaw = donorProfile?.nextAvailableDate || userProfile?.unavailableUntil || null;
  const cooldownUntil = cooldownUntilRaw ? new Date(cooldownUntilRaw) : null;
  const isCooldownActive = hasDonorAvailability && !isAvailable;

  const handleAvailabilityToggle = (nextValue: boolean) => {
    if (isCooldownActive && nextValue) {
      const when = cooldownUntil && !isNaN(cooldownUntil.getTime())
        ? cooldownUntil.toISOString().slice(0, 10)
        : null;
      Alert.alert(
        'Unavailable',
        when ? `You are unavailable until ${when}` : 'You are currently unavailable to donate.'
      );
      return;
    }

    // For non-donor profile mode, preserve existing local toggle behavior.
    if (!hasDonorAvailability) {
      setUserProfile((prev: any) => ({ ...prev, availability: nextValue }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Profile",
            headerStyle: { backgroundColor: semanticColors.bgAlt },
            headerTintColor: semanticColors.textPrimary,
          }}
        />
      )}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS !== 'ios' && styles.scrollContentWithTabBar
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - unified banner */}
        <HeaderBanner style={styles.headerBannerWrap}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="person.fill" size={18} color={semanticColors.textInverse} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Profile</Text>
                <Text style={styles.headerSubtitle}>Your details and settings</Text>
              </View>
            </View>
          </View>
        </HeaderBanner>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(userProfile?.name || 'U N').split(' ').map((n: string) => n[0]).join('')}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={async () => {
              try {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission required', 'Please allow photo library access.'); return; }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1,1] });
                if (result.canceled) return;
                // Minimal upload strategy: since we don't have file upload endpoint, accept a remote URL or base64 data URL if available
                const asset = result.assets?.[0];
                if (!asset?.uri) return;
                setUpdatingAvatar(true);
                // In a real app, upload to storage (S3/Cloudinary) and get a URL. For now, if uri is a remote http(s) we can store it; else show hint.
                if (!/^https?:\/\//i.test(asset.uri)) {
                  Alert.alert('Upload needed', 'Please configure image upload to obtain a public URL. Storing local file URI is not supported across sessions.');
                }
                await apiClient.updateMe({ avatarUrl: asset.uri });
                const me = await apiClient.me();
                setUserProfile(me || {});
              } catch (e: any) {
                Alert.alert('Avatar update failed', e?.message || 'Unknown error');
              } finally {
                setUpdatingAvatar(false);
              }
            }}>
              <IconSymbol name="camera.fill" size={16} color={semanticColors.textInverse} />
            </TouchableOpacity>
            {userProfile?.avatarUrl ? (
              <TouchableOpacity style={[styles.editAvatarButton, { right: 40, backgroundColor: semanticColors.interactiveDanger }]} onPress={async () => {
                try {
                  setUpdatingAvatar(true);
                  await apiClient.updateMe({ avatarUrl: '' });
                  const me = await apiClient.me();
                  setUserProfile(me || {});
                } catch (e: any) {
                  Alert.alert('Remove failed', e?.message || 'Unknown error');
                } finally {
                  setUpdatingAvatar(false);
                }
              }}>
                <IconSymbol name="trash" size={16} color={semanticColors.textInverse} />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <Text style={styles.name}>{userProfile.name}</Text>
          <Text style={styles.email}>{userProfile.email || donorProfile?.email || ''}</Text>
          
          <View style={styles.bloodTypeContainer}>
            <View style={styles.bloodTypeBadge}>
              <IconSymbol name="drop.fill" size={20} color={semanticColors.textInverse} />
              <Text style={styles.bloodTypeText}>{userProfile.bloodType || donorProfile?.bloodGroup || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Availability Toggle */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <View style={styles.availabilityInfo}>
              <IconSymbol 
                name={isAvailable ? "checkmark.circle.fill" : "xmark.circle.fill"} 
                size={24} 
                color={isAvailable ? semanticColors.interactivePrimary : semanticColors.interactiveDanger} 
              />
              <View style={styles.availabilityText}>
                <Text style={styles.availabilityTitle}>Available to Donate</Text>
                <Text style={styles.availabilitySubtitle}>
                  {isAvailable ? "Ready to help save lives" : "Currently unavailable"}
                </Text>
              </View>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              disabled={isCooldownActive}
              trackColor={{ false: semanticColors.borderSubtle, true: semanticColors.interactivePrimary }}
              thumbColor={semanticColors.textInverse}
            />
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoRow}>
            <IconSymbol name="person.fill" size={20} color={semanticColors.interactivePrimary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{userProfile.name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="envelope.fill" size={20} color={semanticColors.interactivePrimary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userProfile.email || donorProfile?.email || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="phone.fill" size={20} color={semanticColors.interactivePrimary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userProfile.phone || donorProfile?.phone || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="drop.fill" size={20} color={semanticColors.interactivePrimary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Blood Type</Text>
              <Text style={styles.infoValue}>{userProfile.bloodType || donorProfile?.bloodGroup || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="location.fill" size={20} color={semanticColors.interactivePrimary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{userProfile.location || donorProfile?.district || '—'}</Text>
            </View>
          </View>
          
          {/* Show donor availability status if user is a donor */}
          {donorProfile && (
            <View style={styles.infoRow}>
              <IconSymbol name="heart.fill" size={20} color={semanticColors.interactivePrimary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Donor Status</Text>
                <Text style={[styles.infoValue, { color: donorProfile.availabilityStatus === 'available' ? semanticColors.interactivePrimary : semanticColors.interactiveDanger }]}>
                  {donorProfile.availabilityStatus === 'available' ? 'Available' : 'Unavailable'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Donation History */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Donation History</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.donationsCount}</Text>
              <Text style={styles.statLabel}>Total Donations</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.lastDonation}</Text>
              <Text style={styles.statLabel}>Last Donation</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.nextEligible}</Text>
              <Text style={styles.statLabel}>Next Eligible</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleEditProfile}>
            <IconSymbol name="pencil" size={20} color={semanticColors.textInverse} />
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSettings}>
            <IconSymbol name="gear" size={20} color={semanticColors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol name="arrow.right.square" size={20} color={semanticColors.interactiveDanger} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// styles are theme-aware via useMemo above
