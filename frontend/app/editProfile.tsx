import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LOCATION_OPTIONS } from '../constants/locations';



const emailRx = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [blood, setBlood] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ [k: string]: string | undefined }>({});

  const bloodOptions = useMemo(
    () => ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    []
  );

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Please enter your name';
    if (!email.trim()) next.email = 'Please enter your email';
    else if (!emailRx.test(email.trim())) next.email = 'Enter a valid email';
    const digits = phone.replace(/\D/g, '');
    if (!digits) next.phone = 'Please enter phone number';
    else if (digits.length < 7) next.phone = 'Enter a valid phone number';
    if (!blood) next.blood = 'Please select a blood type';
    if (!location) next.location = 'Please select your district';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = () => {
    if (!validate()) return;
    Alert.alert('Success', 'Changes saved');
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header matching Settings style */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={'#111827'} />
          <Text style={styles.backTextHeader}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 12 }]}>
        <View style={styles.spacer20} />
        <Text style={styles.pageSubtitle}>Update your information</Text>
        <View style={styles.spacer16} />

        <View style={styles.card}>
          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            placeholder="Enter your name"
            placeholderTextColor={COLORS.fieldHint}
            value={name}
            onChangeText={setName}
            style={styles.input}
            returnKeyType="next"
          />
          {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.fieldGap} />

          {/* Location */}
          <Text style={styles.label}>
            District <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.pickerWrapper}>
            <View style={styles.pickerRow}>
              <Picker
                selectedValue={location}
                onValueChange={(v: string | null) => setLocation(v)}
                style={styles.picker}
                dropdownIconColor={COLORS.labelMuted}
                prompt="Select district"
              >
                <Picker.Item
                  enabled={false}
                  label="Select district"
                  value={null as any}
                  color={COLORS.fieldHint}
                />
                {LOCATION_OPTIONS.map((opt) => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                ))}
              </Picker>
              <Text style={styles.caret}>▾</Text>
            </View>
          </View>
          {!!errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor={COLORS.fieldHint}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            returnKeyType="next"
          />
          {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <View style={styles.fieldGap} />

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            placeholder="Enter phone number"
            placeholderTextColor={COLORS.fieldHint}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            returnKeyType="next"
          />
          {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <View style={styles.fieldGap} />

          {/* Blood Type */}
          <Text style={styles.label}>
            Blood Type <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.pickerWrapper}>
            <View style={styles.pickerRow}>
              <Picker
                selectedValue={blood}
                onValueChange={(v: string | null) => setBlood(v)}
                style={styles.picker}
                dropdownIconColor={COLORS.labelMuted}
                prompt="Select blood type"
              >
                <Picker.Item
                  enabled={false}
                  label="Select blood type"
                  value={null as any}
                  color={COLORS.fieldHint}
                />
                {bloodOptions.map((b) => (
                  <Picker.Item key={b} label={b} value={b} />
                ))}
              </Picker>
              <Text style={styles.caret}>▾</Text>
            </View>
          </View>
          {!!errors.blood && <Text style={styles.errorText}>{errors.blood}</Text>}

          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer24} />
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  label: '#303645',
  labelMuted: '#687081',
  caption: '#6B7280',
  fieldFill: '#F3F6FA',
  fieldHint: '#9AA4B2',
  red: '#FF4B4B',
  cardBorder: '#EEF2F6',
  shadow: 'rgba(0,0,0,0.08)',
};

const styles = {
  root: {
    flex: 1 as const,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: 40
  },
  backBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: '#FDECEA',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    
  },
  backTextHeader: { color: '#111827', fontWeight: '700' as const },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#111827' },
  appBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    height: 56,
    
  },
  appBarLeading: {
    position: 'absolute' as const,
    left: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backText: {
    fontWeight: '700' as const,
    color: COLORS.black,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.black,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  spacer16: { height: 16 },
  spacer20: { height: 20 },
  spacer24: { height: 24 },
  pageSubtitle: {
    textAlign: 'center' as const,
    color: COLORS.caption,
    fontWeight: '900' as const,
    fontSize: 18,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    // shadow (iOS)
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // elevation (Android)
    elevation: 4,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: COLORS.cardBorder,
  },
  label: {
    color: COLORS.label,
    fontWeight: '900' as const,
    fontSize: 16,
    marginBottom: 8,
  },
  requiredStar: {
    color: 'red',
    fontWeight: '900' as const,
  },
  input: {
    backgroundColor: COLORS.fieldFill,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.black,
  },
  errorText: {
    marginTop: 6,
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  fieldGap: { height: 18 },
  pickerWrapper: {
    backgroundColor: COLORS.fieldFill,
    borderRadius: 14,
    overflow: 'hidden' as const,
  },
  pickerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  picker: {
    flex: 1,
    height: 52,
    marginLeft: Platform.OS === 'android' ? -8 : 0, // align text like TextInput
  },
  caret: {
    position: 'absolute' as const,
    right: 14,
    fontSize: 16,
    color: COLORS.labelMuted,
  },
  saveBtn: {
    marginTop: 26,
    backgroundColor: COLORS.red,
    height: 56,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  saveText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800' as const,
  },
} as const;
    
