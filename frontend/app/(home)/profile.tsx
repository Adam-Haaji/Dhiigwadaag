import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Switch, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import api from "../../service/api";
import * as ImagePicker from 'expo-image-picker';
import useAuth from "../../hooks/useAuth";

const colors = {
  background: "#F5F7FA",
  text: "#1F2937",
  textSecondary: "#6B7280",
  card: "#FFFFFF",
  primary: "#E74C3C",
  secondary: "#3498DB",
  success: "#28A745",
  error: "#E74C3C",
  grey: "#D1D5DB",
  border: "#E5E7EB",
};

export default function ProfileScreen() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [userProfile, setUserProfile] = useState<any>({});
  const { logout } = useAuth();
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUserProfile(me || {});
        if (typeof me?.availability === 'boolean') setIsAvailable(!!me.availability);
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

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Profile",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
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
        {/* Header - match Notification header border style */}
        <View style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <IconSymbol name="person.fill" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Profile</Text>
                <Text style={styles.headerSubtitle}>Your details and settings</Text>
              </View>
            </View>
          </View>
        </View>
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
                await api.updateMe({ avatarUrl: asset.uri });
                const me = await api.me();
                setUserProfile(me || {});
              } catch (e: any) {
                Alert.alert('Avatar update failed', e?.message || 'Unknown error');
              } finally {
                setUpdatingAvatar(false);
              }
            }}>
              <IconSymbol name="camera.fill" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            {userProfile?.avatarUrl ? (
              <TouchableOpacity style={[styles.editAvatarButton, { right: 40, backgroundColor: colors.error }]} onPress={async () => {
                try {
                  setUpdatingAvatar(true);
                  await api.updateMe({ avatarUrl: '' });
                  const me = await api.me();
                  setUserProfile(me || {});
                } catch (e: any) {
                  Alert.alert('Remove failed', e?.message || 'Unknown error');
                } finally {
                  setUpdatingAvatar(false);
                }
              }}>
                <IconSymbol name="trash" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <Text style={styles.name}>{userProfile.name}</Text>
          <Text style={styles.email}>{userProfile.email}</Text>
          
          <View style={styles.bloodTypeContainer}>
            <View style={styles.bloodTypeBadge}>
              <IconSymbol name="drop.fill" size={20} color="#FFFFFF" />
              <Text style={styles.bloodTypeText}>{userProfile.bloodType}</Text>
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
                color={isAvailable ? colors.success : colors.error} 
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
              onValueChange={setIsAvailable}
              trackColor={{ false: colors.grey, true: colors.success }}
              thumbColor={isAvailable ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoRow}>
            <IconSymbol name="person.fill" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{userProfile.name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userProfile.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="phone.fill" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userProfile.phone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="drop.fill" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Blood Type</Text>
              <Text style={styles.infoValue}>{userProfile.bloodType}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="location.fill" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{userProfile.location}</Text>
            </View>
          </View>
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
            <IconSymbol name="pencil" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSettings}>
            <IconSymbol name="gear" size={20} color={colors.text} />
            <Text style={styles.secondaryButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol name="arrow.right.square" size={20} color={colors.error} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: colors.primary,
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
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: '#FFE9EF', fontSize: 13, fontWeight: '500', marginTop: 2 },
  profileHeader: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  bloodTypeContainer: {
    alignItems: 'center',
  },
  bloodTypeBadge: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bloodTypeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  availabilityCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
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
    color: colors.text,
    marginBottom: 4,
  },
  availabilitySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
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
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    boxShadow: '0px 4px 12px rgba(231, 76, 60, 0.3)',
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
