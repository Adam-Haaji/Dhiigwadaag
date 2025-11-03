
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform, ToastAndroid, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import api from "../service/api";
import { useForm, Controller } from 'react-hook-form';

export default function CreateRequest() {
  const { control, handleSubmit, setValue, watch, formState: { errors, isValid, isSubmitting } } = useForm({ mode: 'onChange', defaultValues: {
    patientName: '',
    bloodGroup: '' as any,
    district: '' as any,
    contactPerson: '',
    contactPhone: '',
    urgentLevel: '' as any,
    reason: '',
    additionalNote: '',
  }});
  const [focusedField, setFocusedField] = useState('');

  const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'] as const;
  const districts = useMemo(() => [
    'Abdiaziz','Bondhere','Daynile','Dharkenley','Hamar Jajab','Hamar Weyne','Hodan','Howlwadag','Karaan','Shangani','Shibis','Wadajir','Waberi','Wartanabada','Yaqshid'
  ] as const, []);
  const urgentLevels = ['low','medium','high','critical'] as const;
  const scrollRef = useRef<ScrollView | null>(null);

  const handleBack = () => {
    router.back();
  };

  const updateField = (k: any, v: any) => setValue(k, v, { shouldValidate: true });

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.secondary;
      default: return colors.secondary;
    }
  };

  const onSubmit = async (form: any) => {
    try {
      const created = await api.createBloodRequest({
        patientName: form.patientName.trim(),
        bloodGroup: form.bloodGroup as any,
        district: form.district as any,
        contactPerson: form.contactPerson.trim(),
        contactPhone: form.contactPhone.trim(),
        urgentLevel: form.urgentLevel as any,
        reason: form.reason.trim(),
        additionalNote: form.additionalNote ? form.additionalNote.trim() : undefined,
      });
      // Trigger backend smart match for this request
      try { await api.matchRequest({ requestId: String(created?._id) }); } catch {}
      if (Platform.OS === 'android') ToastAndroid.show('Request submitted', ToastAndroid.SHORT);
      else Alert.alert('Success', 'Request submitted');
      const id = created?._id;
      if (id) router.replace(`/requestStatus?id=${id}`);
      else router.replace('/(home)');
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Blood Request</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.form}>
          {/* Patient Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Information</Text>

              <Controller control={control} name="patientName" rules={{ required: true, minLength: 3 }}
                render={({ field }: any) => (
                  <TextInput
              style={[commonStyles.input, focusedField==='patientName' && commonStyles.inputFocused]}
              placeholder="Patient Name *"
              placeholderTextColor={colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onFocus={() => setFocusedField('patientName')}
              onBlur={() => setFocusedField('')}
            />)}
              />
              {errors?.patientName && <Text style={{ color: colors.error, marginTop: 6 }}>Name is required (min 3)</Text>}

            <Text style={styles.inputLabel}>Blood Group *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.bloodTypeSelector}>
                {bloodGroups.map((bg) => (
                  <TouchableOpacity key={bg} style={[styles.bloodTypeOption, (watch('bloodGroup')===bg) && styles.selectedBloodType]} onPress={() => updateField('bloodGroup', bg)}>
                    <Text style={[styles.bloodTypeOptionText, (watch('bloodGroup')===bg) && styles.selectedBloodTypeText]}>{bg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* District */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>District</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.bloodTypeSelector}>
                {districts.map((d) => (
                  <TouchableOpacity key={d} style={[styles.bloodTypeOption, (watch('district')===d) && styles.selectedBloodType]} onPress={() => updateField('district', d)}>
                    <Text style={[styles.bloodTypeOptionText, (watch('district')===d) && styles.selectedBloodTypeText]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
              <Controller control={control} name="contactPerson" rules={{ required: true, minLength: 3 }}
                render={({ field }: any) => (
                  <TextInput
              style={[commonStyles.input, focusedField==='contactPerson' && commonStyles.inputFocused]}
              placeholder="Contact Person *"
              placeholderTextColor={colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onFocus={() => setFocusedField('contactPerson')}
              onBlur={() => setFocusedField('')}
            />)}
              />
              {errors?.contactPerson && <Text style={{ color: colors.error, marginTop: 6 }}>Contact name is required</Text>}
              <Controller control={control} name="contactPhone" rules={{ required: true, pattern: /^\d{9,}$/ }}
                render={({ field }: any) => (
                  <TextInput
              style={[commonStyles.input, focusedField==='contactPhone' && commonStyles.inputFocused]}
              placeholder="Contact Phone *"
              placeholderTextColor={colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onFocus={() => setFocusedField('contactPhone')}
              onBlur={() => setFocusedField('')}
              keyboardType="phone-pad"
            />)}
              />
              {errors?.contactPhone && <Text style={{ color: colors.error, marginTop: 6 }}>Enter a valid phone (9+ digits)</Text>}
          </View>

          {/* Urgent Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Urgent Level *</Text>
            <View style={styles.urgencySelector}>
              {urgentLevels.map((u) => (
                <TouchableOpacity key={u} style={[styles.urgencyOption, (watch('urgentLevel')===u) && [styles.selectedUrgency, { backgroundColor: getUrgencyColor(u) }]]} onPress={() => updateField('urgentLevel', u)}>
                  <Text style={[styles.urgencyOptionText, (watch('urgentLevel')===u) && styles.selectedUrgencyText]}>{u.charAt(0).toUpperCase()+u.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason *</Text>
              <Controller control={control} name="reason" rules={{ required: true, minLength: 3 }}
                render={({ field }: any) => (
                  <TextInput
              style={[commonStyles.input, focusedField==='reason' && commonStyles.inputFocused]}
              placeholder="e.g., Accident, Surgery"
              placeholderTextColor={colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onFocus={() => setFocusedField('reason')}
              onBlur={() => setFocusedField('')}
            />)}
              />
              {errors?.reason && <Text style={{ color: colors.error, marginTop: 6 }}>Reason is required</Text>}
          </View>

          {/* Additional Note */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Note</Text>
              <Controller control={control} name="additionalNote"
                render={({ field }: any) => (
                  <TextInput
              style={[commonStyles.input, styles.textArea, focusedField==='additionalNote' && commonStyles.inputFocused]}
              placeholder="Any additional information (optional)"
              placeholderTextColor={colors.textSecondary}
              value={field.value}
              onChangeText={field.onChange}
              onFocus={() => {
                setFocusedField('additionalNote');
                // Ensure the textarea is visible above the keyboard
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
              }}
              onBlur={() => setFocusedField('')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />)}
              />
          </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.submitButton, (!isValid || isSubmitting) && { opacity: 0.6 }]} onPress={handleSubmit(onSubmit)} disabled={!isValid || isSubmitting}>
            <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  form: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  bloodTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  bloodTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedBloodType: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bloodTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  selectedBloodTypeText: {
    color: '#FFFFFF',
  },
  urgencySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  selectedUrgency: {
    borderColor: 'transparent',
  },
  urgencyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  selectedUrgencyText: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    boxShadow: '0px 4px 12px rgba(231, 76, 60, 0.3)',
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
