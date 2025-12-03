import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import colors, { semanticColors } from "../constants/colors";
import SelectFieldComponent from '../components/SelectField';
import apiClient from "../service/api";
import { useTheme } from '@/context/ThemeContext';

const Signup = () => {
  const router = useRouter();
  const { control, handleSubmit, watch, formState: { errors, isValid, isSubmitting } } = useForm({ mode: 'onChange', defaultValues: { name: '', email: '', phone: '', bloodType: '', password: '', confirmPassword: '' } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Auth hook not needed here (no immediate login after signup)

  const onSubmit = async ({ name, email, phone, bloodType, password, confirmPassword: _confirmPassword }: any) => {
    setError(null);
    setLoading(true);
    try {
  await apiClient.signup({ name, email, password, bloodType, role: 'Requester', location: 'Unknown', phone });
      // Do NOT auto-login; redirect user to login screen after successful signup
      alert('Account created successfully. Please login.');
      router.replace('/login');
    } catch (e: any) {
      setError(e?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const BLOOD_TYPES = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
  ].map(v => ({ label: v, value: v }));

  const { isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: semanticColors.bgAlt }] }>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={semanticColors.bgAlt} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: semanticColors.textPrimary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Join our blood donation community</Text>
          </View>

          <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Full Name *</Text>
              <Controller control={control} name="name"
                rules={{ required: true, minLength: 3 }}
                render={({ field }: any) => (
                  <TextInput style={[styles.input, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary }]} placeholder="Enter your full name" placeholderTextColor={semanticColors.textMuted} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                )}
              />
              {errors?.name && <Text style={styles.err}>Name must be at least 3 characters</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Email *</Text>
              <Controller control={control} name="email"
                rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
                render={({ field }: any) => (
                  <TextInput style={[styles.input, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary }]} placeholder="Enter your email" placeholderTextColor={semanticColors.textMuted} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoCapitalize="none" keyboardType="email-address" />
                )}
              />
              {errors?.email && <Text style={styles.err}>Enter a valid email</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Phone Number *</Text>
              <Controller control={control} name="phone"
                rules={{ required: true, pattern: /^\d{9,}$/ }}
                render={({ field }: any) => (
                  <TextInput style={[styles.input, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary }]} placeholder="Enter your phone number" placeholderTextColor={semanticColors.textMuted} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="phone-pad" />
                )}
              />
              {errors?.phone && <Text style={styles.err}>Enter a valid phone (9+ digits)</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="bloodType"
                rules={{ required: true }}
                render={({ field }: any) => (
                  <SelectFieldComponent
                    label="Blood Type"
                    required
                    placeholder="Select blood type"
                    value={field.value}
                    options={BLOOD_TYPES}
                    onChange={(v) => field.onChange(v)}
                    error={errors?.bloodType ? 'Blood type is required' : undefined}
                  />
                )}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Password *</Text>
              <Controller control={control} name="password"
                rules={{ required: true, minLength: 6 }}
                render={({ field }: any) => (
                  <TextInput style={[styles.input, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary }]} placeholder="Enter your password" placeholderTextColor={semanticColors.textMuted} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} secureTextEntry />
                )}
              />
              {errors?.password && <Text style={styles.err}>Password must be at least 6 characters</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Confirm Password *</Text>
              <Controller control={control} name="confirmPassword"
                rules={{ required: true, validate: (v: any) => v === watch('password') }}
                render={({ field }: any) => (
                  <TextInput style={[styles.input, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary }]} placeholder="Confirm your password" placeholderTextColor={semanticColors.textMuted} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} secureTextEntry />
                )}
              />
              {watch('password') !== watch('confirmPassword') && watch('confirmPassword')?.length > 0 && <Text style={styles.err}>Passwords do not match</Text>}
            </View>

            <TouchableOpacity style={[styles.signUpButton, (!isValid || isSubmitting) && { opacity: 0.6 }]} onPress={handleSubmit(onSubmit)} accessibilityRole="button" disabled={!isValid || isSubmitting}>
              <Text style={styles.signUpButtonText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
            </TouchableOpacity>

            {error && (
              <Text style={{ color: '#E74C3C', textAlign: 'center', marginTop: 10 }}>{error}</Text>
            )}

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: semanticColors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')} accessibilityRole="button">
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoidingView: { flex: 1, justifyContent: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center' },
  card: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderWidth: 1,
  },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
    err: { color: '#E74C3C', marginTop: 6, fontSize: 12 },
  signUpButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  signUpButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  loginContainer: { paddingTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 16 },
  loginLink: { color: colors.primary, fontWeight: '700' },
});

export default Signup;
        
