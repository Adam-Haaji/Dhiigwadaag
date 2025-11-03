import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import colors from "../constants/colors";
import api from "../service/api";
import useAuth from "../hooks/useAuth";

const Signup = () => {
  const router = useRouter();
  const { control, handleSubmit, watch, formState: { errors, isValid, isSubmitting } } = useForm({ mode: 'onChange', defaultValues: { name: '', email: '', phone: '', bloodType: '', password: '', confirmPassword: '' } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();

  const onSubmit = async ({ name, email, phone, bloodType, password, confirmPassword }: any) => {
    setError(null);
    setLoading(true);
    try {
      await api.signup({ name, email, password, bloodType, role: 'Requester', location: 'Unknown', phone });
      // Do NOT auto-login; redirect user to login screen after successful signup
      alert('Account created successfully. Please login.');
      router.replace('/login');
    } catch (e: any) {
      setError(e?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f8ff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our blood donation community</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <Controller control={control} name="name"
                rules={{ required: true, minLength: 3 }}
                render={({ field }: any) => (
                  <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="#9aa0a6" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                )}
              />
              {errors?.name && <Text style={styles.err}>Name must be at least 3 characters</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <Controller control={control} name="email"
                rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
                render={({ field }: any) => (
                  <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#9aa0a6" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoCapitalize="none" keyboardType="email-address" />
                )}
              />
              {errors?.email && <Text style={styles.err}>Enter a valid email</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number *</Text>
              <Controller control={control} name="phone"
                rules={{ required: true, pattern: /^\d{9,}$/ }}
                render={({ field }: any) => (
                  <TextInput style={styles.input} placeholder="Enter your phone number" placeholderTextColor="#9aa0a6" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="phone-pad" />
                )}
              />
              {errors?.phone && <Text style={styles.err}>Enter a valid phone (9+ digits)</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Blood Type *</Text>
              <Controller control={control} name="bloodType"
                rules={{ required: true }}
                render={({ field }: any) => (
                  <TextInput style={styles.input} placeholder="A+, B-, O+, etc" placeholderTextColor="#9aa0a6" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoCapitalize="characters" />
                )}
              />
              {errors?.bloodType && <Text style={styles.err}>Blood type is required</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <Controller control={control} name="password"
                rules={{ required: true, minLength: 6 }}
                render={({ field }: any) => (
                  <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#9aa0a6" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} secureTextEntry />
                )}
              />
              {errors?.password && <Text style={styles.err}>Password must be at least 6 characters</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <Controller control={control} name="confirmPassword"
                rules={{ required: true, validate: (v: any) => v === watch('password') }}
                render={({ field }: any) => (
                  <TextInput style={styles.input} placeholder="Confirm your password" placeholderTextColor="#9aa0a6" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} secureTextEntry />
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
              <Text style={styles.loginText}>Already have an account? </Text>
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
  container: { flex: 1, backgroundColor: '#f7f8ff' },
  keyboardAvoidingView: { flex: 1, justifyContent: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, backgroundColor: '#fff' },
    err: { color: '#E74C3C', marginTop: 6, fontSize: 12 },
  signUpButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  signUpButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  loginContainer: { paddingTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 16, color: '#6b7280' },
  loginLink: { color: colors.primary, fontWeight: '700' },
});

export default Signup;
        
