import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { semanticColors, radii, spacing } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { fontFamilies } from '@/constants/fonts';
import { moderateScale, responsiveFont } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: moderateScale(20),
      paddingVertical: moderateScale(14),
      borderBottomWidth: 1,
      borderBottomColor: semanticColors.borderSubtle,
      backgroundColor: semanticColors.bgSurface,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: semanticColors.bgAlt,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 12,
    },
    headerTitle: { fontSize: responsiveFont(18), fontFamily: fontFamilies.bold },
    backText: { fontFamily: fontFamilies.semibold },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: moderateScale(24), paddingBottom: moderateScale(24) },
    headerWrap: { alignItems: 'center', marginBottom: moderateScale(16) },
    title: { fontSize: responsiveFont(28), fontFamily: fontFamilies.bold },
    subtitle: { fontSize: responsiveFont(16), fontFamily: fontFamilies.medium },
    card: {
      borderRadius: radii.lg,
      paddingHorizontal: moderateScale(spacing.lg),
      paddingVertical: moderateScale(spacing.lg),
      shadowColor: semanticColors.cardShadow,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      borderWidth: 1,
    },
    sectionTitle: { fontSize: responsiveFont(18), fontFamily: fontFamilies.semibold, marginTop: moderateScale(spacing.md), marginBottom: moderateScale(spacing.xs) },
    paragraph: { fontSize: responsiveFont(14), fontFamily: fontFamilies.regular, lineHeight: responsiveFont(20) },
    caption: { marginTop: moderateScale(spacing.md), fontSize: responsiveFont(12), fontFamily: fontFamilies.medium },
  }), [isDark]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: semanticColors.bgAlt }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Header styled like Settings */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={semanticColors.textPrimary} />
          <Text style={[styles.backText, { color: semanticColors.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: semanticColors.textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={[styles.title, { color: semanticColors.textPrimary }]}>Privacy Policy</Text>
          <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Your privacy matters to us</Text>
        </View>

        <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }]}>
          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Overview</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>This Privacy Policy explains how our blood donation app collects, uses, and protects your information. By using the app, you agree to the practices described here.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Information We Collect</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>We collect the information you provide when creating an account or submitting requests, including name, email, phone, role (Donor/Requester), blood group, district/location, and optional profile details. We also collect basic usage data such as device information and in-app activity to improve the service.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>How We Use Your Information</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>We use your information to: match donors with requests, send notifications about urgent requests, facilitate contact between donors and requesters, improve app features and reliability, and comply with legal requirements. We do not sell your personal data.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Sharing and Disclosure</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>We only share limited information when needed to complete a donation or assist with a request. For example, donors may see requester contact details after accepting a match, and requesters may see donor contact details when appropriate. We may share data with service providers (e.g., push notifications) strictly for app functionality.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Data Security</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>We use reasonable technical and organizational measures to protect your information. However, no method of transmission or storage is completely secure. Please keep your login credentials safe and contact us if you suspect unauthorized access.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Data Retention</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>We retain your data for as long as necessary to provide the service and meet legal or operational requirements. You can request deletion of your account, subject to any obligations that require us to keep certain records.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Your Rights</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>You may access, update, or delete your profile information from within the app. If you need assistance, contact us using the details below. Depending on your region, you may have additional rights regarding your personal data.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Contact Us</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>If you have questions about this Privacy Policy or how we handle your data, please reach out via the Contact Us option in Settings or email our support team.</Text>

          <Text style={[styles.caption, { color: semanticColors.textMuted }]}>Last updated: {new Date().toLocaleDateString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
