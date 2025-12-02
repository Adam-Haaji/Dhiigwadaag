import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import apiClient from "../service/api";
import useAuth from "@/hooks/useAuth";
import SelectFieldComponent from '../components/SelectField';

export default function BloodRequest() {
  const { user, setUser } = useAuth();
  const [focusedField, setFocusedField] = useState('');
  const [form, setForm] = useState({
    patientName: '',
    bloodGroup: '' as '' | 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-',
    district: '' as '' | 'Abdiaziz'|'Bondhere'|'Daynile'|'Dharkenley'|'Hamar Jajab'|'Hamar Weyne'|'Hodan'|'Howlwadaag'|'Howlwadag'|'Kaaran'|'Karaan'|'Shangani'|'Shibis'|'Wadajir'|'Wadajir (Medina)'|'Waberi'|'Wartanabada'|'Wardhiigley (Warta Nabadda)'|'Yaqshid'|'Garasbaley'|'Kahda',
    units: '',
    contactPerson: '',
    contactPhone: '',
    urgentLevel: '' as '' | 'low'|'medium'|'high'|'critical',
    reason: '',
    additionalNote: '',
  });

  const bloodTypeOptions = useMemo(() => (
    ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ label: v, value: v }))
  ), []);
  const districtOptions = useMemo(() => (
    [
      'Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley', 'Hamar Jajab', 'Hamar Weyne', 'Hodan',
      'Howlwadaag', 'Kaaran', 'Shangani', 'Shibis', 'Wadajir (Medina)', 'Waberi',
      'Wardhiigley (Warta Nabadda)', 'Yaqshid', 'Garasbaley', 'Kahda'
    ].map(v => ({ label: v, value: v }))
  ), []);
  const urgentLevels = ['low','medium','high','critical'] as const;

  const update = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const notifySuccess = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('Success', msg);
  };

  const validate = () => {
    if (!form.patientName || !form.bloodGroup || !form.district || !form.contactPerson || !form.contactPhone || !form.urgentLevel || !form.reason) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return false;
    }
    const u = Number(form.units);
    if (!Number.isFinite(u) || u < 1) {
      Alert.alert('Units required', 'Please enter units needed (minimum 1).');
      return false;
    }
    if (!/^[0-9+\-()\s]{6,20}$/.test(form.contactPhone.trim())) {
      Alert.alert('Invalid phone', 'Please enter a valid contact phone number.');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    try {
      // Ensure requester role before creating a requester-only resource
      const role = String(user?.user?.role || '').toLowerCase();
      if (role !== 'requester') {
        try {
          const updated = await apiClient.switchRole('requester');
          const token = user?.token;
          await setUser({ token, user: updated });
        } catch {}
      }
      const resp: any = await apiClient.createBloodRequest({
        patientName: form.patientName.trim(),
        bloodGroup: form.bloodGroup as any,
        district: form.district as any,
        units: Number(form.units),
        contactPerson: form.contactPerson.trim(),
        contactPhone: form.contactPhone.trim(),
        urgentLevel: form.urgentLevel as any,
        reason: form.reason.trim(),
        additionalNote: form.additionalNote ? form.additionalNote.trim() : undefined,
      });
      if (resp?.user) {
        await setUser({ ...(user || {}), user: resp.user });
      }
      notifySuccess('Blood request submitted');
      router.replace('/(home)/request');
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blood Request</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Patient Name *</Text>
          <TextInput
            style={[commonStyles.input, focusedField==='patientName' && commonStyles.inputFocused]}
            placeholder="Patient full name"
            placeholderTextColor={colors.textSecondary}
            value={form.patientName}
            onChangeText={(v) => update('patientName', v)}
            onFocus={() => setFocusedField('patientName')}
            onBlur={() => setFocusedField('')}
          />
        </View>

        <View style={styles.section}>
          <SelectFieldComponent
            label="Blood Group"
            required
            placeholder="Select Blood Group"
            value={form.bloodGroup}
            options={bloodTypeOptions}
            onChange={(v) => update('bloodGroup', v)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Units Needed *</Text>
          <TextInput
            style={[commonStyles.input, focusedField==='units' && commonStyles.inputFocused]}
            placeholder="Number of units (bags)"
            placeholderTextColor={colors.textSecondary}
            value={form.units}
            onChangeText={(v) => update('units', v.replace(/[^\d]/g, ''))}
            onFocus={() => setFocusedField('units')}
            onBlur={() => setFocusedField('')}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.section}>
          <SelectFieldComponent
            label="District"
            required
            placeholder="Select District"
            value={form.district}
            options={districtOptions}
            onChange={(v) => update('district', v)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Contact Person *</Text>
          <TextInput
            style={[commonStyles.input, focusedField==='contactPerson' && commonStyles.inputFocused]}
            placeholder="Requester name"
            placeholderTextColor={colors.textSecondary}
            value={form.contactPerson}
            onChangeText={(v) => update('contactPerson', v)}
            onFocus={() => setFocusedField('contactPerson')}
            onBlur={() => setFocusedField('')}
          />
          <TextInput
            style={[commonStyles.input, focusedField==='contactPhone' && commonStyles.inputFocused]}
            placeholder="Contact phone *"
            placeholderTextColor={colors.textSecondary}
            value={form.contactPhone}
            onChangeText={(v) => update('contactPhone', v)}
            onFocus={() => setFocusedField('contactPhone')}
            onBlur={() => setFocusedField('')}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Urgent Level *</Text>
          <View style={styles.rowWrap}>
            {urgentLevels.map((u) => (
              <TouchableOpacity key={u} style={[styles.chip, form.urgentLevel===u && styles.chipActive]} onPress={() => update('urgentLevel', u)}>
                <Text style={[styles.chipText, form.urgentLevel===u && styles.chipTextActive]}>{u.charAt(0).toUpperCase()+u.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Reason *</Text>
          <TextInput
            style={[commonStyles.input, focusedField==='reason' && commonStyles.inputFocused]}
            placeholder="e.g., Accident, Surgery"
            placeholderTextColor={colors.textSecondary}
            value={form.reason}
            onChangeText={(v) => update('reason', v)}
            onFocus={() => setFocusedField('reason')}
            onBlur={() => setFocusedField('')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Additional Note</Text>
          <TextInput
            style={[commonStyles.input, styles.textArea, focusedField==='additionalNote' && commonStyles.inputFocused]}
            placeholder="Any extra instructions (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.additionalNote}
            onChangeText={(v) => update('additionalNote', v)}
            onFocus={() => setFocusedField('additionalNote')}
            onBlur={() => setFocusedField('')}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={submit}>
          <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>Submit Request</Text>
        </TouchableOpacity>
      </View>
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
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  rowWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' as const },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  textArea: { height: 100, paddingTop: 16 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border },
  submitButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, boxShadow: '0px 4px 12px rgba(231, 76, 60, 0.3)', elevation: 4 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginLeft: 8 },
});
