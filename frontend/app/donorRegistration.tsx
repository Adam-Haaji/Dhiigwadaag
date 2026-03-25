import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Keyboard, Modal, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { commonStyles } from '@/styles/commonStyles';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api from "../service/api";
import useAuth from "@/hooks/useAuth";
import SelectField from '../components/SelectField';
import { LOCATION_OPTIONS } from '@/constants/locations';
import { notify } from '@/ui/feedback/notify';
import { MESSAGES } from '@/ui/feedback/messages';
// Note: Native date picker is optional; we'll lazy-require it to avoid build errors when offline

export default function DonorRegistration() {
  const { setUser, user } = useAuth();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{ fromRoleSelection?: string }>();
  const fromRoleSelection = params.fromRoleSelection === '1';
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
    hb: '',
    medicalCondition: 'None',
  });
  
  // Check if user already has a donor record - if yes, redirect to dashboard (don't show form again)
  useEffect(() => {
    (async () => {
      try {
        const donorData = await api.donorMe();
        if (donorData?.exists) {
          const r = String(user?.user?.role || '').toLowerCase();
          if (r === 'donor') {
            router.replace('/(donor)/donor');
            return;
          }
          if (r === 'requester') {
            router.replace('/(requester)');
            return;
          }
          // Role not yet donor (e.g. still "user"): initial path from Choose Your Path -> donor-only tabs only
          if (fromRoleSelection) {
            const { setNavigatorRole } = await import('@/service/homeMode');
            await setNavigatorRole('donor');
            setUser({ token: user?.token, user: { ...user?.user, role: 'donor' } });
            router.replace('/(donor)/donor');
            return;
          }
          router.replace('/(home)/donor');
          return;
        }
      } catch {}
      
      // Prefill from current profile (only if not already a donor)
      try {
        const me = await api.me();
        setFormData(prev => ({
          ...prev,
          fullName: me?.name || prev.fullName,
          email: me?.email || prev.email,
          phone: me?.phone || prev.phone,
          district: me?.location || prev.district,
          bloodGroup: me?.bloodType || prev.bloodGroup,
        }));
      } catch {}
    })();
  }, []);
  const [focusedField, setFocusedField] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showIOSDatePicker, setShowIOSDatePicker] = useState(false);
  const [donatedBefore, setDonatedBefore] = useState(false);
  const [lastDonationDate, setLastDonationDate] = useState<Date | null>(null);
  const [lastDonationDateError, setLastDonationDateError] = useState<string | null>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const phoneRegex = useMemo(() => /^\d{9,12}$/, []);
  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const nameRegex = useMemo(() => /^[A-Za-z\s]+$/, []);

  const bloodTypeOptions = useMemo(() => (
    ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ label: v, value: v }))
  ), []);
  const districtOptions = useMemo(() => LOCATION_OPTIONS, []);
  const medicalConditionOptions = useMemo(() => (
    ['None', 'Malaria', 'HIV', 'Hepatitis', 'Tuberculosis', 'Heart Disease', 'Diabetes', 'Cancer', 'Asthma', 'High Blood Pressure', 'Recent Surgery', 'Pregnant', 'Other'].map(v => ({ label: v, value: v }))
  ), []);
  const totalSteps = 1;


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

  const formatDisplayDate = (input: string): string => {
    const d = parseDate(input);
    if (!d) return 'mm/dd/yyyy';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const formatDateForState = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const deriveDobFromAge = (ageYears: number): Date => {
    const now = new Date();
    const y = now.getFullYear() - ageYears;
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const d = Math.min(now.getDate(), lastDay);
    return new Date(y, m, d);
  };

  const handleBack = () => {
    // Navigate back to previous screen
    // This will return to request dashboard if user came from there
    router.back();
  };

  const openDatePicker = () => {
    const current = lastDonationDate || parseDate(formData.lastDonationDate) || new Date();
    if (Platform.OS === 'android') {
      try {
         
        const { DateTimePickerAndroid } = require('@react-native-community/datetimepicker');
        DateTimePickerAndroid.open({
          value: current,
          mode: 'date',
          is24Hour: false,
          maximumDate: new Date(),
          onChange: (event: any, selectedDate: Date | undefined) => {
            if (event.type === 'set' && selectedDate) {
              setLastDonationDate(selectedDate);
              setLastDonationDateError(null);
              updateFormData('lastDonationDate', formatDateForState(selectedDate));
            }
          },
        });
      } catch (e) {
        notify.info(
          MESSAGES.donor.registration.datePickerUnavailable.title,
          MESSAGES.donor.registration.datePickerUnavailable.body
        );
      }
    } else {
      setShowIOSDatePicker(true);
    }
  };

  const validationErrors = useMemo(() => {
    const errs: Record<string,string> = {};
    const ageNum = Number(formData.age);
    const weightNum = Number(formData.weightKg);
    const hbNum = Number(formData.hb);
    if (!formData.age) errs.age = 'Age required';
    if (!Number.isFinite(ageNum) || ageNum < 18) errs.age = "Da'daadu waa ka yar tahay 18";
    else if (ageNum > 65) errs.age = "Da'daadu waa ka weyn tahay 65";
    if (!formData.weightKg) errs.weightKg = 'Weight required';
    else if (weightNum < 50) errs.weightKg = 'Miisaankaaga waa <50kg';
    if (!formData.gender) errs.gender = 'Gender required';
    if (!formData.hb) errs.hb = 'HB required';
    else if (formData.gender === 'Male' && hbNum < 13) errs.hb = 'HB-gaagu waa hooseeya (rag)';
    else if (formData.gender === 'Female' && hbNum < 12) errs.hb = 'HB-gaagu waa hooseeya (dumar)';
    if (!formData.bloodGroup) errs.bloodGroup = 'Blood type required';
    if (!formData.district) errs.district = 'Location required';
    if (!phoneRegex.test(formData.phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!emailRegex.test(formData.email.trim())) errs.email = 'Please enter a valid email address (example@gmail.com)';
    if (!nameRegex.test(formData.fullName.trim())) errs.fullName = 'This field must contain letters only';
    // Cooldown (use existing user lastDonationDate if present)
    const last = user?.user?.lastDonationDate ? new Date(user.user.lastDonationDate) : null;
    if (last && !isNaN(last.getTime())) {
      const nextEligible = new Date(last.getTime() + 90*24*60*60*1000);
      if (nextEligible.getTime() > Date.now()) {
        errs.cooldown = `Waad dhawaan dhiig bixi⁠day; sug ilaa ${nextEligible.toLocaleDateString()}`;
      }
    }
    return errs;
  }, [formData, phoneRegex, user]);

  const isValid = useMemo(() => Object.keys(validationErrors).length === 0, [validationErrors]);

  const handleNext = () => {
    if (donatedBefore && !lastDonationDate) {
      setLastDonationDateError('Please select your last donation date.');
      notify.error("Last donation date is required if you’ve donated before.");
      return;
    }
    setLastDonationDateError(null);
    if (!isValid) {
      notify.warning(MESSAGES.donor.registration.validation.title, MESSAGES.donor.registration.validation.body);
      return;
    }
    handleSubmit();
  };

  const [submitting, setSubmitting] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setIneligibleReason(null);
    try {
      // Allow any user to register as donor (role separation allows both requester and donor records)
      // Create donor record using createDonor endpoint
      const ageNum = Number(formData.age);
      const dateOfBirth = deriveDobFromAge(ageNum);
      
      const resp: any = await api.createDonor({
        fullName: formData.fullName,
        dateOfBirth: dateOfBirth.toISOString(),
        gender: formData.gender.toLowerCase() === 'male' ? 'male' : 'female',
        phone: formData.phone,
        email: formData.email,
        district: formData.district as any,
        bloodGroup: formData.bloodGroup as any,
        weightKg: Number(formData.weightKg),
        consentGiven: true, // Default to true for registration
        emergencyContact: {
          name: formData.fullName || 'Emergency Contact',
          relationship: 'Family',
          phone: formData.phone || '',
        },
        donatedBefore,
        lastDonationDate: formData.lastDonationDate ? toIso(formData.lastDonationDate) : null,
        medicalCondition: formData.medicalCondition || 'None',
        hb: formData.hb ? Number(formData.hb) : undefined, // Include hb field for eligibility check
        // Always set to 'available' on registration - donor becomes unavailable only after donating
        availabilityStatus: 'available',
      });
      
      if (resp?.donor || resp?.user) {
        // Initial selection from Choose Your Path: set role="donor" ONLY and show DonorTabs (no Request tab).
        if (fromRoleSelection) {
          const { setNavigatorRole } = await import('@/service/homeMode');
          await setNavigatorRole('donor');
          await setUser({
            token: user?.token,
            user: { ...(resp?.user || user?.user || {}), role: 'donor' },
          });
          notify.success(MESSAGES.donor.registration.success.title, MESSAGES.donor.registration.success.body);
          router.replace('/(donor)');
        } else {
          if (resp?.user) await setUser({ ...(user || {}), user: resp.user });
          await new Promise(resolve => setTimeout(resolve, 2000));
          notify.success(MESSAGES.donor.registration.success.title, MESSAGES.donor.registration.success.body);
          router.replace('/(home)/donor');
        }
      } else {
        throw new Error(resp?.error || 'Unknown response');
      }
    } catch (e: any) {
      let msg = e?.message || 'Failed';
      // Parse JSON error bodies thrown by API helper
      if (msg && msg.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(msg);
          msg = parsed?.reason || parsed?.error || msg;
          if (parsed?.error === 'forbidden_donor_only') {
            msg = 'Please switch to Donor role and try again.';
          }
        } catch {}
      }
      setIneligibleReason(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 0 : 84;
  const bottomOffset = (keyboardHeight > 0 ? keyboardHeight : TAB_BAR_HEIGHT) + insets.bottom + 12;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: semanticColors.borderSubtle, backgroundColor: semanticColors.bgSurface },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: semanticColors.textPrimary },
    placeholder: { width: 40 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingVertical: 20 },
    card: { backgroundColor: semanticColors.bgSurface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    cardTitle: { fontSize: 20, fontWeight: '800', color: semanticColors.interactivePrimary, marginBottom: 4 },
    cardSub: { color: semanticColors.textSecondary, marginBottom: 16 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 16, fontWeight: '500', color: semanticColors.textPrimary, marginBottom: 12 },
    dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dropdownPanel: { backgroundColor: semanticColors.bgSurface, borderWidth: 1, borderColor: semanticColors.borderSubtle, borderRadius: 8, marginTop: 8, overflow: 'hidden' },
    dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: semanticColors.borderSubtle },
    dropdownText: { fontSize: 14, color: semanticColors.textPrimary },
    dropdownTextSelected: { fontWeight: '700', color: semanticColors.interactivePrimary },
    registerBtn: { backgroundColor: semanticColors.interactivePrimary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: semanticColors.borderSubtle },
    registerBtnText: { fontSize: 16, fontWeight: '700' },
    dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateText: { color: semanticColors.textPrimary, fontSize: 16 },
    datePlaceholder: { color: semanticColors.textSecondary },
    conditionalGroup: { marginTop: 6, marginBottom: 4 },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      borderRadius: 12,
      backgroundColor: semanticColors.bgSurface,
    },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: semanticColors.textPrimary, flex: 1, paddingRight: 12 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: semanticColors.bgSurface, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderColor: semanticColors.borderSubtle, borderTopWidth: 1 },
    modalDoneBtn: { marginTop: 12, alignSelf: 'flex-end', backgroundColor: semanticColors.interactivePrimary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    modalDoneText: { fontWeight: '700' },
    errorText: { color: semanticColors.interactiveDanger, marginTop: 6, fontSize: 13 },
    ineligibleBox: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: semanticColors.bgElevated, borderWidth: 1, borderColor: semanticColors.interactiveDanger },
    ineligibleTitle: { fontWeight: '700', color: semanticColors.interactiveDanger, marginBottom: 4 },
    ineligibleReason: { color: semanticColors.interactiveDanger, marginBottom: 6 },
    ineligibleHint: { color: semanticColors.textSecondary, fontSize: 12 },
  }), [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={semanticColors.textPrimary} />
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
            style={[
              commonStyles.input,
              { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary },
              focusedField === 'fullName' && commonStyles.inputFocused
            ]}
            placeholder="Full Name *"
            placeholderTextColor={semanticColors.textSecondary}
            value={formData.fullName}
            onChangeText={(value) => updateFormData('fullName', value)}
            onFocus={() => setFocusedField('fullName')}
            onBlur={() => setFocusedField('')}
          />
          {validationErrors.fullName && <Text style={styles.errorText}>{validationErrors.fullName}</Text>}

          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary },
              focusedField === 'email' && commonStyles.inputFocused
            ]}
            placeholder="Email Address *"
            placeholderTextColor={semanticColors.textSecondary}
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField('')}
            keyboardType="email-address"
          />
          {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}

          <View style={styles.inputGroup}>
            <SelectField
              label="Blood Type"
              required
              placeholder="Select blood type"
              value={formData.bloodGroup}
              options={bloodTypeOptions}
              onChange={(v: string) => updateFormData('bloodGroup', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <SelectField
              label="Location"
              required
              placeholder="Select your district"
              value={formData.district}
              options={districtOptions}
              onChange={(v: string) => updateFormData('district', v)}
            />
          </View>

          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary },
              focusedField === 'phone' && commonStyles.inputFocused
            ]}
            placeholder="Phone Number *"
            placeholderTextColor={semanticColors.textSecondary}
            value={formData.phone}
            onChangeText={(value) => updateFormData('phone', value)}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField('')}
            keyboardType="phone-pad"
          />
          {validationErrors.phone && <Text style={styles.errorText}>{validationErrors.phone}</Text>}
          <View style={styles.inputGroup}>
            <SelectField
              label="Gender"
              required
              placeholder="Select gender"
              value={formData.gender}
              options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]}
              onChange={(v: string) => updateFormData('gender', v)}
            />
          </View>

          <Text style={styles.inputLabel}>Age *</Text>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary },
              focusedField === 'age' && commonStyles.inputFocused
            ]}
            placeholder="Enter your age"
            placeholderTextColor={semanticColors.textSecondary}
            value={formData.age}
            onChangeText={(v) => updateFormData('age', v.replace(/[^0-9]/g, '').slice(0, 3))}
            onFocus={() => setFocusedField('age')}
            onBlur={() => setFocusedField('')}
            keyboardType="number-pad"
            inputMode="numeric"
          />
          {validationErrors.age && <Text style={styles.errorText}>{validationErrors.age}</Text>}

          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary },
              focusedField === 'weightKg' && commonStyles.inputFocused
            ]}
            placeholder="Weight"
            placeholderTextColor={semanticColors.textSecondary}
            value={formData.weightKg}
            onChangeText={(v) => updateFormData('weightKg', v)}
            onFocus={() => setFocusedField('weightKg')}
            onBlur={() => setFocusedField('')}
            keyboardType="numeric"
          />
          {validationErrors.weightKg && <Text style={styles.errorText}>{validationErrors.weightKg}</Text>}

          <Text style={styles.inputLabel}>Hemoglobin (HB)</Text>
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary },
              focusedField === 'hb' && commonStyles.inputFocused
            ]}
            placeholder="HB g/dL"
            placeholderTextColor={semanticColors.textSecondary}
            value={formData.hb}
            onChangeText={(v) => updateFormData('hb', v.replace(/[^0-9.]/g,'').slice(0,5))}
            onFocus={() => setFocusedField('hb')}
            onBlur={() => setFocusedField('')}
            keyboardType="decimal-pad"
          />
          {validationErrors.hb && <Text style={styles.errorText}>{validationErrors.hb}</Text>}

          <View style={styles.conditionalGroup}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>I have donated blood before</Text>
              <Switch
                value={donatedBefore}
                onValueChange={(v) => {
                  setDonatedBefore(v);
                  setLastDonationDateError(null);
                  if (!v) {
                    setLastDonationDate(null);
                    updateFormData('lastDonationDate', '');
                  }
                }}
                thumbColor={Platform.OS === 'android' ? (donatedBefore ? semanticColors.interactivePrimary : semanticColors.borderStrong) : undefined}
                trackColor={{ false: semanticColors.borderStrong, true: semanticColors.interactivePrimary }}
                accessibilityRole="switch"
                accessibilityLabel="I have donated blood before"
              />
            </View>

            {donatedBefore && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Last donation date</Text>
                <TouchableOpacity
                  style={[
                    commonStyles.input,
                    { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle },
                    styles.dateInput,
                  ]}
                  activeOpacity={0.7}
                  onPress={openDatePicker}
                  accessibilityRole="button"
                  accessibilityLabel="Last donation date"
                >
                  <Text style={[styles.dateText, !formData.lastDonationDate && styles.datePlaceholder]}>
                    {formData.lastDonationDate ? formatDisplayDate(formData.lastDonationDate) : 'Select a date'}
                  </Text>
                  <IconSymbol name="calendar" size={18} color={semanticColors.textSecondary} />
                </TouchableOpacity>
                {!!lastDonationDateError && <Text style={styles.errorText}>{lastDonationDateError}</Text>}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <SelectField
              label="Medical Condition"
              required
              placeholder="Select medical condition"
              value={formData.medicalCondition}
              options={medicalConditionOptions}
              onChange={(v: string) => updateFormData('medicalCondition', v)}
            />
          </View>
            {/* Availability field removed - donors are always 'available' on registration */}
            {/* They become 'unavailable' only after clicking "I Have Donated" */}

            <TouchableOpacity
              style={[styles.registerBtn, (!isValid || submitting) && { opacity: 0.5 } ]}
              activeOpacity={isValid && !submitting ? 0.7 : 1}
              onPress={isValid && !submitting ? handleNext : undefined}
            >
              <Text style={[styles.registerBtnText, { color: semanticColors.textInverse }]}>{submitting ? 'Submitting...' : 'Register'}</Text>
            </TouchableOpacity>

            {validationErrors.cooldown && <Text style={styles.errorText}>{validationErrors.cooldown}</Text>}
            {ineligibleReason && (
              <View style={styles.ineligibleBox}>
                <Text style={styles.ineligibleTitle}>Ineligible</Text>
                <Text style={styles.ineligibleReason}>{ineligibleReason}</Text>
                <Text style={styles.ineligibleHint}>Consult a clinician or update data to become eligible.</Text>
              </View>
            )}
        </View>
      </ScrollView>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal transparent visible={showIOSDatePicker} animationType="fade" onRequestClose={() => setShowIOSDatePicker(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowIOSDatePicker(false)}>
            <View style={styles.modalSheet}>
              {(() => {
                try {
                   
                  const DT = require('@react-native-community/datetimepicker').default;
                  return (
                    <DT
                      value={lastDonationDate || parseDate(formData.lastDonationDate) || new Date()}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onChange={(_: any, selectedDate: Date | undefined) => {
                        if (selectedDate) {
                          setLastDonationDate(selectedDate);
                          setLastDonationDateError(null);
                          updateFormData('lastDonationDate', formatDateForState(selectedDate));
                        }
                      }}
                      style={{ width: '100%' }}
                    />
                  );
                } catch (e) {
                  return (
                    <Text style={{ color: semanticColors.textPrimary }}>
                      Date picker is not available. Install &quot;@react-native-community/datetimepicker&quot; to enable native selection.
                    </Text>
                  );
                }
              })()}
              <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowIOSDatePicker(false)}>
                <Text style={[styles.modalDoneText, { color: semanticColors.textInverse }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

 
