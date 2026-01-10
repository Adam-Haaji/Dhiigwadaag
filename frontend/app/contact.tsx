import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { semanticColors, radii, spacing } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { fontFamilies } from '@/constants/fonts';
import { moderateScale, responsiveFont } from '@/constants/theme';
import * as Linking from 'expo-linking';

const SUPPORT_PHONE_E164 = '+252618560664';
const SUPPORT_PHONE_WA = '252618560664';
const SUPPORT_EMAIL = 'amiinciise111@gmail.com';

export default function ContactUsScreen() {
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
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      borderWidth: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: moderateScale(16),
      paddingVertical: moderateScale(14),
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: semanticColors.bgAlt,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: { fontSize: responsiveFont(16), fontFamily: fontFamilies.semibold, color: semanticColors.textPrimary },
    rowSubtitle: { fontSize: responsiveFont(12), fontFamily: fontFamilies.regular, color: semanticColors.textSecondary, marginTop: 2 },
    separator: { height: 1, backgroundColor: semanticColors.borderSubtle },
  }), [isDark]);

  const openWhatsApp = async () => {
    try {
      const appScheme = 'whatsapp://send';
      const appUrl = `${appScheme}?phone=${encodeURIComponent(SUPPORT_PHONE_E164)}`;
      const webUrl = `https://wa.me/${SUPPORT_PHONE_WA}`;
      const supported = await Linking.canOpenURL(appScheme);
      if (supported) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to open WhatsApp');
    }
  };

  const openEmail = async () => {
    try {
      const subject = 'Support Request';
      const body = 'Hello,\n\nI need help with...';
      const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to open email');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: semanticColors.bgAlt }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Header styled like Settings */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={semanticColors.textPrimary} />
          <Text style={[styles.backText, { color: semanticColors.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: semanticColors.textPrimary }]}>Contact Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={[styles.title, { color: semanticColors.textPrimary }]}>Contact Us</Text>
          <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Reach us via WhatsApp or Email</Text>
        </View>

        <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }]}>
          {/* WhatsApp */}
          <TouchableOpacity style={styles.row} onPress={openWhatsApp} accessibilityRole="button">
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}><Ionicons name="logo-whatsapp" size={18} color="#25D366" /></View>
              <View>
                    <Text style={styles.rowTitle}>WhatsApp</Text>
                    <Text style={styles.rowSubtitle}>Chat with us at {SUPPORT_PHONE_E164}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={semanticColors.textMuted} />
          </TouchableOpacity>
          <View style={styles.separator} />
          {/* Email */}
          <TouchableOpacity style={styles.row} onPress={openEmail} accessibilityRole="button">
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}><Ionicons name="mail-open-outline" size={18} color={semanticColors.interactivePrimary} /></View>
              <View>
                    <Text style={styles.rowTitle}>Email</Text>
                    <Text style={styles.rowSubtitle}>Write to {SUPPORT_EMAIL}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={semanticColors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
