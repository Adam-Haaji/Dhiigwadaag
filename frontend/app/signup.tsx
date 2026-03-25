import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import colors, { semanticColors, spacing, typography } from "../constants/colors";
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import SectionCard from '@/components/SectionCard';
import apiClient from "../service/api";
import { useTheme } from '@/context/ThemeContext';
import { notify } from '@/ui/feedback/notify';
import { MESSAGES } from '@/ui/feedback/messages';

const Signup = () => {
  const router = useRouter();
  const { control, handleSubmit, watch, formState: { errors, isValid, isSubmitting } } = useForm({ mode: 'onChange', defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Auth hook not needed here (no immediate login after signup)

  const onSubmit = async ({ name, email, phone, password, confirmPassword: _confirmPassword }: any) => {
    setError(null);
    setLoading(true);
    try {
      // Create normal user (role: 'user') - they will choose Donor or Requester after login
      await apiClient.signup({ name, email, password, role: 'Donor', location: '', phone });
      // Do NOT auto-login; redirect user to login screen after successful signup
      notify.success(MESSAGES.auth.signup.success.title, MESSAGES.auth.signup.success.body);
      router.replace('/login');
    } catch (e: any) {
      setError(e?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

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

          <SectionCard>
            <View style={styles.inputContainer}>
              <Controller control={control} name="name"
                rules={{ required: true, minLength: 3, pattern: /^[A-Za-z\s]+$/ }}
                render={({ field }: any) => (
                  <AppInput label="Full Name *" placeholder="Enter your full name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                )}
              />
              {errors?.name && <Text style={styles.err}>{errors.name.type === 'pattern' ? 'This field must contain letters only' : 'Name must be at least 3 characters'}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Controller control={control} name="email"
                rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
                render={({ field }: any) => (
                  <AppInput label="Email *" placeholder="Enter your email" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoCapitalize="none" keyboardType="email-address" />
                )}
              />
              {errors?.email && <Text style={styles.err}>Please enter a valid email address (example@gmail.com)</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Controller control={control} name="phone"
                rules={{ required: true, pattern: /^\d{9,12}$/ }}
                render={({ field }: any) => (
                  <AppInput label="Phone Number *" placeholder="Enter your phone number" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="phone-pad" />
                )}
              />
              {errors?.phone && <Text style={styles.err}>Enter a valid phone number</Text>}
            </View>


            <View style={styles.inputContainer}>
              <Controller control={control} name="password"
                rules={{ required: true, pattern: /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/ }}
                render={({ field }: any) => (
                  <AppInput label="Password *" placeholder="Enter your password" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} secureTextEntry />
                )}
              />
              {errors?.password && <Text style={styles.err}>Password must be at least 8 characters and include a number, uppercase letter, and symbol</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Controller control={control} name="confirmPassword"
                rules={{ required: true, validate: (v: any) => v === watch('password') }}
                render={({ field }: any) => (
                  <AppInput label="Confirm Password *" placeholder="Confirm your password" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} secureTextEntry />
                )}
              />
              {watch('password') !== watch('confirmPassword') && watch('confirmPassword')?.length > 0 && <Text style={styles.err}>Passwords do not match</Text>}
            </View>

            <AppButton
              title={loading ? 'Creating...' : 'Sign Up'}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || isSubmitting}
              loading={loading}
              variant="primary"
            />

            {error && (
              <Text style={{ color: '#E74C3C', textAlign: 'center', marginTop: 10 }}>{error}</Text>
            )}

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: semanticColors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')} accessibilityRole="button">
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
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
  card: { paddingHorizontal: 0 },
  inputContainer: { marginBottom: 20 },
  label: { ...typography.label, fontWeight: '600', marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
    err: { color: '#E74C3C', marginTop: 6, fontSize: 12 },
  loginContainer: { paddingTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 16 },
  loginLink: { color: colors.primary, fontWeight: '700' },
});

export default Signup;
        
