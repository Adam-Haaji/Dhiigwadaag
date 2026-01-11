import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectField from '../components/SelectField';
import { LOCATION_OPTIONS } from '@/constants/locations';
import { router } from 'expo-router';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { semanticColors, radii, spacing } from '@/constants/colors';
import { fontFamilies } from '@/constants/fonts';
import { moderateScale, responsiveFont } from '@/constants/theme';

type FormState = {
  patientName: string;
  bloodType: string | null;
  units: string;
  hospitalName: string;
  location: string | null;
  phone: string;
  urgency: string | null;
  notes: string;
};

const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
].map(v => ({ label: v, value: v }));

// Use centralized location options
const LOCATIONS = LOCATION_OPTIONS;

const URGENCY = [
  { label: 'Normal', value: 'normal' },
  { label: 'Critical', value: 'critical' },
];

// Use theme semantic colors for accents

const CreateRequestScreen: React.FC<{ onBack?: () => void; onSubmitSuccess?: (data: FormState) => void; }> = ({
  onBack,
  onSubmitSuccess,
}) => {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
  const [form, setForm] = useState<FormState>({
    patientName: '',
    bloodType: null,
    units: '',
    hospitalName: '',
    location: null,
    phone: '',
    urgency: null,
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.patientName.trim()) e.patientName = 'Patient name is required.';
    if (!form.bloodType) e.bloodType = 'Please select a blood type.';
    // Units optional; if provided must be a positive number
    if (form.units && (Number.isNaN(Number(form.units)) || Number(form.units) <= 0)) {
      e.units = 'Enter units as a positive number.';
    }
    // Require hospital name so donors can identify the facility
    if (!form.hospitalName.trim()) e.hospitalName = 'Hospital name is required.';
    if (!form.location) e.location = 'Please select a location.';
    if (!/^\+?[0-9()\-\s]{7,}$/.test(form.phone.trim())) e.phone = 'Enter a valid contact phone.';
    if (!form.urgency) e.urgency = 'Please select urgency.';
    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setSubmitted(true);
    if (hasErrors) {
      Alert.alert('Check your input', 'Please fill in all required fields correctly.');
      return;
    }
    try {
      // Ensure requester role before creating request
      const role = String(user?.user?.role || '').toLowerCase();
      if (role !== 'requester') {
        try {
          const updated = await api.switchRole('requester');
          const token = user?.token;
          await setUser({ token, user: updated });
        } catch {}
      }

      // Create the request in backend
      const payload: { patientName: string; bloodType: string; location: string; units: number; urgency: 'Normal'|'Critical'; hospitalName?: string; contactPhone?: string; notes?: string } = {
        patientName: form.patientName.trim(),
        bloodType: String(form.bloodType),
        location: String(form.location),
        units: Number(form.units || '1'),
        // Backend normalizes to 'Normal' or 'Critical'; send title case
        urgency: String(form.urgency || 'normal').toLowerCase() === 'critical' ? 'Critical' : 'Normal',
        hospitalName: form.hospitalName.trim() || undefined,
        contactPhone: form.phone.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      try {
        const created = await api.createRequest(payload);
      } catch (e1: any) {
        const msg = e1?.message || '';
        // If role guard blocked, try switching and retry once
        if (msg.includes('forbidden_requester_only') || msg.includes('Forbidden') || msg.includes('403')) {
          try {
            const updated = await api.switchRole('requester');
            const token = user?.token;
            await setUser({ token, user: updated });
            const created2 = await api.createRequest(payload);
          } catch (e2: any) {
            throw e2;
          }
        } else {
          throw e1;
        }
      }
      onSubmitSuccess?.(form);
      // Navigate back to Request dashboard
      router.replace('/(home)/request');
    } catch (e: any) {
      Alert.alert('Submit failed', e?.message || 'Could not create request.');
    }
  };
  const handleBack = () => {
    if (onBack) return onBack();
    router.back();
  };

  const s = useMemo(() => StyleSheet.create({
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
    backText: { fontFamily: fontFamilies.semibold },
    headerTitle: { fontSize: responsiveFont(18), fontFamily: fontFamilies.bold },
    content: {
      paddingHorizontal: moderateScale(24),
      paddingTop: moderateScale(14),
      paddingBottom: moderateScale(24),
    },
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
      borderColor: semanticColors.borderSubtle,
      backgroundColor: semanticColors.bgSurface,
    },
    field: { marginBottom: 14 },
    label: { fontSize: 14, color: semanticColors.textPrimary, marginBottom: 6, fontFamily: fontFamilies.semibold },
    required: { color: semanticColors.interactiveDanger, fontFamily: fontFamilies.bold },
    input: {
      height: 48,
      backgroundColor: semanticColors.bgSurface,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: semanticColors.textPrimary,
    },
    inputError: { borderColor: semanticColors.interactiveDanger },
    errorText: { marginTop: 6, color: semanticColors.interactiveDanger, fontSize: 12, fontFamily: fontFamilies.medium },
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 2 },
    col: { flexGrow: 1 },
    textArea: { height: 120, paddingTop: 12, paddingBottom: 12 },
    submitBtn: {
      marginTop: 10,
      backgroundColor: semanticColors.interactivePrimary,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: semanticColors.cardShadow,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    submitBtnActiveAnyway: {},
    submitText: { color: semanticColors.textInverse, fontFamily: fontFamilies.bold, fontSize: 16 },
  }), [isDark]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: semanticColors.bgAlt }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header styled like Privacy/Settings */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={22} color={semanticColors.textPrimary} />
          <Text style={[s.backText, { color: semanticColors.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: semanticColors.textPrimary }]}>Create Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.headerWrap}>
            <Text style={[s.title, { color: semanticColors.textPrimary }]}>Create Request</Text>
            <Text style={[s.subtitle, { color: semanticColors.textSecondary }]}>Fill in the patient details</Text>
          </View>

          <View style={s.card}>
            <View style={s.field}>
              <Text style={s.label}>
                Patient Name <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                value={form.patientName}
                onChangeText={(t) => set('patientName', t)}
                placeholder="Enter patient name"
                placeholderTextColor={semanticColors.textMuted}
                style={[s.input, submitted && errors.patientName ? s.inputError : undefined]}
              />
              {submitted && errors.patientName ? (
                <Text style={s.errorText}>{errors.patientName}</Text>
              ) : null}
            </View>

            <View style={s.row}>
              <View style={[s.col, { flex: 1 }]}>
                <SelectField
                  label="Blood Type"
                  required
                  placeholder="Type"
                  value={form.bloodType}
                  options={BLOOD_TYPES}
                  onChange={(v) => set('bloodType', v)}
                  error={submitted ? errors.bloodType : undefined}
                />
              </View>

              <View style={[s.col, { width: 110 }]}>
                <Text style={s.label}>
                  Units Needed <Text style={s.required}>*</Text>
                </Text>
                <TextInput
                  value={form.units}
                  onChangeText={(t) => set('units', t.replace(/[^\d]/g, ''))}
                  placeholder="Units"
                  keyboardType="number-pad"
                  placeholderTextColor={semanticColors.textMuted}
                  style={[s.input, submitted && errors.units ? s.inputError : undefined]}
                />
                {submitted && errors.units ? (
                  <Text style={s.errorText}>{errors.units}</Text>
                ) : null}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>
                Hospital Name <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                value={form.hospitalName}
                onChangeText={(t) => set('hospitalName', t)}
                placeholder="Enter hospital name"
                placeholderTextColor={semanticColors.textMuted}
                style={[s.input, submitted && errors.hospitalName ? s.inputError : undefined]}
              />
              {submitted && errors.hospitalName ? (
                <Text style={s.errorText}>{errors.hospitalName}</Text>
              ) : null}
            </View>

            <SelectField
              label="Location"
              required
              placeholder="Select location"
              value={form.location}
              options={LOCATIONS}
              onChange={(v) => set('location', v)}
              error={submitted ? errors.location : undefined}
            />

            <View style={s.field}>
              <Text style={s.label}>
                Contact Phone <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                value={form.phone}
                onChangeText={(t) => set('phone', t)}
                placeholder="Enter contact number"
                keyboardType="phone-pad"
                placeholderTextColor={semanticColors.textMuted}
                style={[s.input, submitted && errors.phone ? s.inputError : undefined]}
              />
              {submitted && errors.phone ? (
                <Text style={s.errorText}>{errors.phone}</Text>
              ) : null}
            </View>

            <SelectField
              label="Urgency Level"
              required
              placeholder="Select urgency"
              value={form.urgency}
              options={URGENCY}
              onChange={(v) => set('urgency', v)}
              error={submitted ? errors.urgency : undefined}
            />

            <View style={s.field}>
              <Text style={s.label}>Additional Notes</Text>
              <TextInput
                value={form.notes}
                onChangeText={(t) => set('notes', t)}
                placeholder="Any additional information..."
                placeholderTextColor={semanticColors.textMuted}
                style={[s.input, s.textArea]}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[s.submitBtn, hasErrors && submitted && s.submitBtnActiveAnyway]}
              onPress={handleSubmit}
              activeOpacity={0.9}
            >
              <Text style={s.submitText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateRequestScreen;