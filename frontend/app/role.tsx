import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';

export default function RoleSelect() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState<'donor'|'requester'|null>(null);

  const doSwitch = async (newRole: 'donor'|'requester') => {
    if (loading) return;
    setLoading(newRole);
    try {
      const updated = await api.switchRole(newRole);
      const token = user?.token;
      await setUser({ token, user: updated });
      router.replace(newRole === 'donor' ? '/(home)/donor' : '/(home)/request');
    } catch (e) {
      // If backend role switch fails, still navigate so the user can proceed
      router.replace(newRole === 'donor' ? '/(home)/donor' : '/(home)/request');
    } finally {
      setLoading(null);
    }
  };
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={[s.scrollContent, Platform.OS !== 'ios' && s.scrollWithTab]} showsVerticalScrollIndicator={false}>
        <View style={s.headerHero}>
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.headerIconWrap}>
                <IconSymbol name="drop.fill" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={s.headerTitle}>Choose Your Path</Text>
                <Text style={s.headerSubtitle}>Donate blood or request help</Text>
              </View>
            </View>
          </View>
          <View style={s.heroImagesRow}>
            <View style={s.heroCircle}><IconSymbol name="heart.fill" size={28} color="#fff" /></View>
            <View style={s.heroCircleAlt}><IconSymbol name="person.2.fill" size={28} color="#fff" /></View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Choose your role to begin</Text>
        <View style={s.cardGrid}>
          <View style={s.card}>
            <Image source={require('../assets/image/onboarding1.png')} resizeMode="cover" style={s.cardImage} />
            <View style={s.cardIconWrap}><IconSymbol name="hand.thumbsup.fill" size={28} color="#fff" /></View>
            <Text style={s.cardTitle}>Become Donor</Text>
            <Text style={s.cardText}>Switch now. Registration appears inside Donor tab only if needed.</Text>
            <TouchableOpacity style={[s.ctaBtn, s.donor]} onPress={() => doSwitch('donor')} disabled={!!loading}>
              {loading === 'donor' ? <ActivityIndicator color="#fff" /> : <IconSymbol name="arrow.right.circle.fill" size={18} color="#fff" />}
              <Text style={s.ctaTxt}>Switch to Donor</Text>
            </TouchableOpacity>
            <View style={s.chipsRow}>
              <View style={s.chip}><IconSymbol name="drop.fill" size={16} color="#fff" /><Text style={s.chipTxt}>A+/O-</Text></View>
              <View style={s.chip}><IconSymbol name="bandage.fill" size={16} color="#fff" /><Text style={s.chipTxt}>Safe & sterile</Text></View>
              <View style={s.chip}><IconSymbol name="clock.fill" size={16} color="#fff" /><Text style={s.chipTxt}>10-15 min</Text></View>
            </View>
          </View>

          <View style={s.card}>
            <Image source={require('../assets/image/onboarding2.png')} resizeMode="cover" style={s.cardImage} />
            <View style={[s.cardIconWrap, { backgroundColor: colors.secondary }]}><IconSymbol name="bell.fill" size={28} color="#fff" /></View>
            <Text style={s.cardTitle}>Become Requester</Text>
            <Text style={s.cardText}>Switch now. Request forms live inside the Request tab.</Text>
            <TouchableOpacity style={[s.ctaBtn, s.request]} onPress={() => doSwitch('requester')} disabled={!!loading}>
              {loading === 'requester' ? <ActivityIndicator color="#fff" /> : <IconSymbol name="arrow.right.circle.fill" size={18} color="#fff" />}
              <Text style={s.ctaTxt}>Switch to Requester</Text>
            </TouchableOpacity>
            <View style={s.chipsRow}>
              <View style={[s.chip, { backgroundColor: colors.secondary }]}><IconSymbol name="location.fill" size={16} color="#fff" /><Text style={s.chipTxt}>Nearby help</Text></View>
              <View style={[s.chip, { backgroundColor: colors.secondary }]}><IconSymbol name="phone.fill" size={16} color="#fff" /><Text style={s.chipTxt}>Direct contact</Text></View>
              <View style={[s.chip, { backgroundColor: colors.secondary }]}><IconSymbol name="bell.fill" size={16} color="#fff" /><Text style={s.chipTxt}>Instant alert</Text></View>
            </View>
          </View>
        </View>

        <View style={sinfo.infoCard}>
          <Text style={sinfo.infoTitle}>Tips</Text>
          <View style={sinfo.row}><IconSymbol name="checkmark.seal.fill" size={18} color={colors.success} /><Text style={sinfo.infoText}>Donor eligibility: Age 18–65, weight ≥50kg, HB threshold</Text></View>
          <View style={sinfo.row}><IconSymbol name="lock.fill" size={18} color={colors.textSecondary} /><Text style={sinfo.infoText}>Your data is protected and used only for matching</Text></View>
          <View style={sinfo.row}><IconSymbol name="sparkles" size={18} color={colors.accent} /><Text style={sinfo.infoText}>You can switch roles anytime from the dashboards</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20 },
  scrollWithTab: { paddingBottom: 100 },
  headerHero: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: '#FFE9EF', fontSize: 13, fontWeight: '500', marginTop: 2 },
  heroImagesRow: { flexDirection: 'row', marginTop: 12 },
  heroCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  heroCircleAlt: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  cardGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, elevation: 3 },
  cardImage: { width: '100%', height: 90, borderRadius: 12, marginBottom: 12 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardText: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  donor: { backgroundColor: colors.primary },
  request: { backgroundColor: '#E53935' },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.primary, marginRight: 8, marginTop: 8 },
  chipTxt: { color: '#fff', fontSize: 12, marginLeft: 6 },
});

const sinfo = StyleSheet.create({
  infoCard: { marginTop: 20, backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  infoTitle: { fontWeight: '800', color: colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { marginLeft: 8, color: colors.textSecondary },
});
