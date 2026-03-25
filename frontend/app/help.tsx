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

export default function HelpCenterScreen() {
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
        <Text style={[styles.headerTitle, { color: semanticColors.textPrimary }]}>About App</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={[styles.title, { color: semanticColors.textPrimary }]}>About App</Text>
          <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Learn more about the app and its features</Text>
        </View>

        <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }]}>
          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Getting Started</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>Create an account and choose your role (Donor or Requester). You can switch roles later from Settings. Donors can register their profile; Requesters can create blood requests.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Account & Roles</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>Your role determines the available actions. Donors see matches and can respond to requests. Requesters can create and track requests. If you register as a donor, your role may become Both.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Requests & Matches</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>Requesters create a request with blood group and district. The system finds compatible donors and may notify them. Donors can accept, contact, or donate. Lives Saved reflects fulfilled requests.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Notifications</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>Enable Push and Email notifications in Settings to receive updates on emergency alerts, matches, and status changes.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Troubleshooting</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>If you can’t reach the server, check your internet connection and ensure the app’s API base URL is set correctly. On Android emulator, the backend is usually reachable via 10.0.2.2:5000. You can also refresh the Home stats by pulling down.</Text>

          <Text style={[styles.sectionTitle, { color: semanticColors.textPrimary }]}>Contact Support</Text>
          <Text style={[styles.paragraph, { color: semanticColors.textSecondary }]}>Use the Contact Us option in Settings to reach our team, or email support if provided. Include your app version from Settings → About when reporting issues.</Text>

          <Text style={[styles.caption, { color: semanticColors.textMuted }]}>Last updated: {new Date().toLocaleDateString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
