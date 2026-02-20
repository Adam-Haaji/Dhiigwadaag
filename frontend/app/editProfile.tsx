import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SelectField from '../components/SelectField';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LOCATION_OPTIONS } from '../constants/locations';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api from '@/service/api';
import useAuth from '@/hooks/useAuth';



const emailRx = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [blood, setBlood] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<{ [k: string]: string | undefined }>({});

  // Match donor registration ordering for consistency
  const bloodOptions = useMemo(
    () => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me: any = await api.me();
        if (!alive) return;
        setName(String(me?.name || ''));
        setEmail(String(me?.email || ''));
        setPhone(String(me?.phone || ''));
        setBlood((me?.bloodType || me?.bloodGroup || null) as any);
        setLocation((me?.location || me?.district || null) as any);
      } catch {
        // ignore
      }
    })();
    return () => { alive = false; };
  }, []);

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        bloodType: blood,
        location,
      };
      const updated: any = await api.updateMe(payload);
      // Keep AuthContext in sync (preserve token)
      const token = user?.token;
      if (token && updated) {
        await setUser({ token, user: updated });
      }
      Alert.alert('Success', 'Changes saved');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(() => ({
    root: { flex: 1 as const },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    backBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: semanticColors.bgAlt,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 12,
    },
    backTextHeader: { fontWeight: '700' as const },
    headerTitle: { fontSize: 20, fontWeight: '800' as const },
    content: { paddingHorizontal: 20, paddingBottom: 24 },
    spacer16: { height: 16 },
    spacer20: { height: 20 },
    spacer24: { height: 24 },
    pageSubtitle: {
      textAlign: 'center' as const,
      fontWeight: '900' as const,
      fontSize: 18,
    },
    card: {
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      shadowColor: semanticColors.cardShadow,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      borderWidth: 1,
    },
    label: {
      fontWeight: '900' as const,
      fontSize: 16,
      marginBottom: 8,
    },
    input: {
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: Platform.OS === 'ios' ? 16 : 12,
      fontSize: 16,
      fontWeight: '700' as const,
      borderWidth: 1,
    },
    errorText: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '700' as const,
    },
    fieldGap: { height: 18 },
    saveBtn: {
      marginTop: 26,
      height: 56,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: saving ? 0.7 : 1,
    },
    saveText: {
      fontSize: 18,
      fontWeight: '800' as const,
    },
  }), [isDark, saving]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: semanticColors.bgAlt }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Header matching Settings style */}
      <View style={[styles.header, { backgroundColor: semanticColors.bgSurface, borderBottomColor: semanticColors.borderSubtle }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={semanticColors.textPrimary} />
          <Text style={[styles.backTextHeader, { color: semanticColors.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: semanticColors.textPrimary }]}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 12 }]}>
        <View style={styles.spacer20} />
        <Text style={[styles.pageSubtitle, { color: semanticColors.textSecondary }]}>Update your information</Text>
        <View style={styles.spacer16} />

        <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
          {/* Full Name */}
          <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Full Name</Text>
          <TextInput
            placeholder="Enter your name"
            placeholderTextColor={semanticColors.textMuted}
            value={name}
            onChangeText={setName}
            style={[styles.input, { backgroundColor: semanticColors.bgSurface, color: semanticColors.textPrimary, borderColor: semanticColors.borderSubtle }]}
            returnKeyType="next"
          />
          {!!errors.name && <Text style={[styles.errorText, { color: semanticColors.interactiveDanger }]}>{errors.name}</Text>}

          <View style={styles.fieldGap} />

          {/* Location (SelectField) – aligned with Donor Registration design */}
          <SelectField
            label="Location"
            placeholder="Select your district"
            value={location ?? null}
            options={LOCATION_OPTIONS}
            onChange={(v) => setLocation(v)}
            required
            error={errors.location}
            testID="editProfile-district"
          />

          {/* Email */}
          <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Email</Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor={semanticColors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { backgroundColor: semanticColors.bgSurface, color: semanticColors.textPrimary, borderColor: semanticColors.borderSubtle }]}
            returnKeyType="next"
          />
          {!!errors.email && <Text style={[styles.errorText, { color: semanticColors.interactiveDanger }]}>{errors.email}</Text>}

          <View style={styles.fieldGap} />

          {/* Phone */}
          <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Phone Number</Text>
          <TextInput
            placeholder="Enter phone number"
            placeholderTextColor={semanticColors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={[styles.input, { backgroundColor: semanticColors.bgSurface, color: semanticColors.textPrimary, borderColor: semanticColors.borderSubtle }]}
            returnKeyType="next"
          />
          {!!errors.phone && <Text style={[styles.errorText, { color: semanticColors.interactiveDanger }]}>{errors.phone}</Text>}

          <View style={styles.fieldGap} />

          {/* Blood Type (SelectField) */}
          <SelectField
            label="Blood Type"
            placeholder="Select blood type"
            value={blood ?? null}
            options={bloodOptions.map(b => ({ label: b, value: b }))}
            onChange={(v) => setBlood(v)}
            required
            error={errors.blood}
            testID="editProfile-bloodType"
          />

          {/* Save button */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: semanticColors.interactivePrimary }]} onPress={onSave}>
            <Text style={[styles.saveText, { color: semanticColors.textInverse }]}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer24} />
      </ScrollView>
    </SafeAreaView>
  );
}


