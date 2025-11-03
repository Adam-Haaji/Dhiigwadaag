import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import api from "../service/api";

export default function DonorRegistration() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    age: '',
    gender: '',
    phone: '',
    district: '',
    bloodGroup: '',
    weightKg: '',
    lastDonationDate: '',
    availabilityStatus: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const phoneRegex = useMemo(() => /^\+?[0-9\s\-()]{7,20}$/, []);

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const districts = useMemo(() => [
    'Abdiaziz','Bondhere','Daynile','Dharkenley','Hamar Jajab','Hamar Weyne','Hodan','Howlwadag','Karaan','Shangani','Shibis','Wadajir','Waberi','Wartanabada','Yaqshid'
  ], []);
  const ages = Array.from({ length: 63 }, (_, i) => (i + 18).toString());
  const totalSteps = 1;

  const SelectField = ({ label, placeholder, value, options, onChange }: any) => {
    const [open, setOpen] = useState(false);
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[commonStyles.input, styles.dropdownButton]}
          onPress={() => setOpen(!open)}
        >
          <Text style={{ color: value ? colors.text : colors.textSecondary }}>
            {value || placeholder}
          </Text>
          <IconSymbol name={open ? 'chevron.up' : 'chevron.down'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {open && (
          <View style={styles.dropdownPanel}>
            <ScrollView style={{ maxHeight: 220 }}>
              {options.map((opt: string) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownItem}
                  onPress={() => { onChange(opt); setOpen(false); }}
                >
                  <Text style={[styles.dropdownText, value === opt && styles.dropdownTextSelected]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Helpers
  const parseDate = (input: string): Date | null => {
    if (!input) return null;
    const t = input.trim();
    const d1 = new Date(t);
    if (!isNaN(d1.getTime())) return d1;
    // Try mm/dd/yyyy
    const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const mm = Number(m[1]) - 1;
      const dd = Number(m[2]);
      const yy = Number(m[3]);
      const dt = new Date(yy, mm, dd);
      return isNaN(dt.getTime()) ? null : dt;
    }
    return null;
  };

  const toIso = (s: string): string => {
    const d = parseDate(s);
    return d ? d.toISOString() : new Date().toISOString();
  };

  const deriveDobFromAge = (ageYears: number): Date => {
    const now = new Date();
    const y = now.getFullYear() - ageYears;
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const d = Math.min(now.getDate(), lastDay);
    return new Date(y, m, d);
  };

  const handleBack = () => { router.back(); };

  const handleNext = () => {
    const f = formData;
    const ageNum = Number(f.age);
    const weight = Number(f.weightKg);

    if (
      !f.fullName.trim() || 
      !f.email.trim() ||
      !phoneRegex.test(f.phone.trim()) ||
      !f.gender || 
      !f.district || 
      !f.bloodGroup ||
      !f.availabilityStatus ||
      !Number.isFinite(ageNum) || ageNum < 18 || ageNum > 80 ||
      !Number.isFinite(weight) || weight < 50
    ) {
      Alert.alert('Xog aan sax ahayn', 'Fadlan buuxi xogta saxda ah oo dhan.');
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    try {
      const ageNum = Number(formData.age);
      const dob = deriveDobFromAge(Number.isFinite(ageNum) ? ageNum : 25);
      const availability = formData.availabilityStatus.toLowerCase() === 'available' ? 'available' : 'unavailable';
      await api.createDonor({
        fullName: formData.fullName.trim(),
        dateOfBirth: dob.toISOString(),
        gender: (formData.gender.toLowerCase() as 'male' | 'female'),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        district: formData.district as any,
        bloodGroup: formData.bloodGroup as any,
        weightKg: Number(formData.weightKg),
        consentGiven: true,
        emergencyContact: { name: formData.fullName.trim(), relationship: 'self', phone: formData.phone.trim() },
        lastDonationDate: toIso(formData.lastDonationDate),
        availabilityStatus: availability,
      });
      Alert.alert('Success', 'Donor registration submitted successfully.', [
        { text: 'OK', onPress: () => router.replace('/(home)') },
      ]);
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message || 'Please try again');
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 0 : 84;
  const bottomOffset = (keyboardHeight > 0 ? keyboardHeight : TAB_BAR_HEIGHT) + insets.bottom + 12;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donor Registration</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomOffset + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Donor Registration</Text>
          <Text style={styles.cardSub}>Complete your donor profile</Text>

          <TextInput
            style={[commonStyles.input, focusedField === 'fullName' && commonStyles.inputFocused]}
            placeholder="Full Name *"
            placeholderTextColor={colors.textSecondary}
            value={formData.fullName}
            onChangeText={(value) => updateFormData('fullName', value)}
            onFocus={() => setFocusedField('fullName')}
            onBlur={() => setFocusedField('')}
          />

          <TextInput
            style={[commonStyles.input, focusedField === 'email' && commonStyles.inputFocused]}
            placeholder="Email Address *"
            placeholderTextColor={colors.textSecondary}
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField('')}
            keyboardType="email-address"
          />

          <SelectField
            label="Blood Type *"
            placeholder="Select blood type"
            value={formData.bloodGroup}
            options={bloodTypes}
            onChange={(v: string) => updateFormData('bloodGroup', v)}
          />

          <SelectField
            label="Location *"
            placeholder="Select your district"
            value={formData.district}
            options={districts}
            onChange={(v: string) => updateFormData('district', v)}
          />

          <TextInput
            style={[commonStyles.input, focusedField === 'phone' && commonStyles.inputFocused]}
            placeholder="Phone Number *"
            placeholderTextColor={colors.textSecondary}
            value={formData.phone}
            onChangeText={(value) => updateFormData('phone', value)}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField('')}
            keyboardType="phone-pad"
          />

          <SelectField
            label="Gender *"
            placeholder="Select gender"
            value={formData.gender}
            options={['Male', 'Female']}
            onChange={(v: string) => updateFormData('gender', v)}
          />

          <SelectField
            label="Age *"
            placeholder="Select age"
            value={formData.age}
            options={ages}
            onChange={(v: string) => updateFormData('age', v)}
          />

          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={[commonStyles.input, focusedField === 'weightKg' && commonStyles.inputFocused]}
            placeholder="Weight"
            placeholderTextColor={colors.textSecondary}
            value={formData.weightKg}
            onChangeText={(v) => updateFormData('weightKg', v)}
            onFocus={() => setFocusedField('weightKg')}
            onBlur={() => setFocusedField('')}
            keyboardType="numeric"
          />

          <SelectField
            label="Availability *"
            placeholder="Select availability"
            value={formData.availabilityStatus}
            options={['Available', 'Unavailable']}
            onChange={(v: string) => updateFormData('availabilityStatus', v)}
          />

          <TouchableOpacity style={styles.registerBtn} onPress={handleNext}>
            <Text style={styles.registerBtnText}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  cardSub: { color: colors.textSecondary, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 12 },
  dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownPanel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 8, overflow: 'hidden' },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText: { fontSize: 14, color: colors.text },
  dropdownTextSelected: { fontWeight: '700', color: colors.primary },
  registerBtn: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
