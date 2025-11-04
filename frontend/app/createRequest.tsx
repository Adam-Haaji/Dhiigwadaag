import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SelectField from '../components/SelectField';

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

const LOCATIONS = [
  'Abdiaziz',
  'Bondhere',
  'Daynile',
  'Dharkenley',
  'Hamar Jajab',
  'Hamar Weyne',
  'Hodan',
  'Howlwadaag',
  'Kaaran',
  'Shangani',
  'Shibis',
  'Wadajir (Medina)',
  'Waberi',
  'Wardhiigley (Warta Nabadda)',
  'Yaqshid',
  'Garasbaley',
  'Kahda',
].map(v => ({ label: v, value: v }));

const URGENCY = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

const accent = '#E74C3C'; // pinkish accent to match screenshot vibe

const CreateRequestScreen: React.FC<{ onBack?: () => void; onSubmitSuccess?: (data: FormState) => void; }> = ({
  onBack,
  onSubmitSuccess,
}) => {
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
    if (!form.units || Number.isNaN(Number(form.units)) || Number(form.units) <= 0) {
      e.units = 'Enter units needed (a positive number).';
    }
    if (!form.hospitalName.trim()) e.hospitalName = 'Hospital name is required.';
    if (!form.location) e.location = 'Please select a location.';
    if (!/^\+?[0-9()\-\s]{7,}$/.test(form.phone.trim())) e.phone = 'Enter a valid contact phone.';
    if (!form.urgency) e.urgency = 'Please select urgency.';
    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    setSubmitted(true);
    if (hasErrors) {
      Alert.alert('Check your input', 'Please fill in all required fields correctly.');
      return;
    }
    onSubmitSuccess?.(form);
    Alert.alert('Request Submitted', 'Your request has been submitted successfully.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header - match Notification style */}
          <View style={styles.headerGradient}>
            <View style={styles.headerRowTop}>
              <TouchableOpacity style={styles.backRow} onPress={onBack}>
                <Text style={styles.backIcon}>←</Text>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Create Request</Text>
            <Text style={styles.headerSubtitle}>Fill in the patient details</Text>
          </View>

          <View style={styles.card}>
            {/* Patient Name */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Patient Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={form.patientName}
                onChangeText={(t) => set('patientName', t)}
                placeholder="Enter patient name"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, submitted && errors.patientName && styles.inputError]}
              />
              {submitted && errors.patientName ? (
                <Text style={styles.errorText}>{errors.patientName}</Text>
              ) : null}
            </View>

            {/* Blood Type + Units Needed */}
            <View style={styles.row}>
              <View style={[styles.col, { flex: 1 }]}>
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

              <View style={[styles.col, { width: 110 }]}>
                <Text style={styles.label}>
                  Units Needed <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  value={form.units}
                  onChangeText={(t) => set('units', t.replace(/[^\d]/g, ''))}
                  placeholder="Units"
                  keyboardType="number-pad"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, submitted && errors.units && styles.inputError]}
                />
                {submitted && errors.units ? (
                  <Text style={styles.errorText}>{errors.units}</Text>
                ) : null}
              </View>
            </View>

            {/* Hospital Name */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Hospital Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={form.hospitalName}
                onChangeText={(t) => set('hospitalName', t)}
                placeholder="Enter hospital name"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, submitted && errors.hospitalName && styles.inputError]}
              />
              {submitted && errors.hospitalName ? (
                <Text style={styles.errorText}>{errors.hospitalName}</Text>
              ) : null}
            </View>

            {/* Location */}
            <SelectField
              label="Location"
              required
              placeholder="Select location"
              value={form.location}
              options={LOCATIONS}
              onChange={(v) => set('location', v)}
              error={submitted ? errors.location : undefined}
            />

            {/* Contact Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Contact Phone <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={form.phone}
                onChangeText={(t) => set('phone', t)}
                placeholder="Enter contact number"
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, submitted && errors.phone && styles.inputError]}
              />
              {submitted && errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}
            </View>

            {/* Urgency */}
            <SelectField
              label="Urgency Level"
              required
              placeholder="Select urgency"
              value={form.urgency}
              options={URGENCY}
              onChange={(v) => set('urgency', v)}
              error={submitted ? errors.urgency : undefined}
            />

            {/* Additional Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                value={form.notes}
                onChangeText={(t) => set('notes', t)}
                placeholder="Any additional information..."
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, hasErrors && submitted && styles.submitBtnActiveAnyway]}
              onPress={handleSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.submitText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC', // page background
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: accent,
    marginBottom: 12,
  },
  headerRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  backIcon: {
    fontSize: 16,
    color: '#374151',
    marginRight: 6,
  },
  backText: {
    fontSize: 14,
    color: '#374151',
  },
  headerTitle: { marginTop: 6, fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: '#FFE9EF', marginBottom: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',

    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '600',
  },
  required: {
    color: '#E74C3C',
    fontWeight: '700',
  },
  input: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',

    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    marginTop: 6,
    color: '#EF4444',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  col: {
    flexGrow: 1,
  },
  textArea: {
    height: 112,
    paddingTop: 10,
    paddingBottom: 10,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: accent,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: accent,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitBtnActiveAnyway: {
    // Keep the strong color even if there are errors; UX matches screenshot emphasis
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default CreateRequestScreen;