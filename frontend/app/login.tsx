import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import colors from "../constants/colors";
import apiClient from "../service/api";
import useAuthHook from "../hooks/useAuth";

const Login = () => {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isValid, isSubmitting } } = useForm({ mode: 'onChange', defaultValues: { email: '', password: '' } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuthHook();

  const onSubmit = async ({ email, password }: any) => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.login({ email, password });
      await setUser({ token: res.token, user: res.user });
      const role = String(res?.user?.role || '').toLowerCase();
      if (role === 'none') router.replace('/role');
      else router.replace('/(home)');
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f8ff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Card with form */}
          <View style={styles.card}>
            {/* Email/Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <Controller control={control} name="email"
                rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
                render={({ field }: any) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9aa0a6"
                    value={field.value}
                    onChangeText={field.onChange}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                )}
              />
              {errors?.email && <Text style={styles.errorText}>Enter a valid email</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <Controller control={control} name="password"
                rules={{ required: true, minLength: 6 }}
                render={({ field }: any) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9aa0a6"
                    value={field.value}
                    onChangeText={field.onChange}
                    secureTextEntry
                  />
                )}
              />
              {errors?.password && <Text style={styles.errorText}>Password must be at least 6 characters</Text>}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/forgotPassword')}
              accessibilityRole="button"
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
              <TouchableOpacity  style={[styles.loginButton, ((loading || !isValid || isSubmitting) && { opacity: 0.7 })]} onPress={handleSubmit(onSubmit)} accessibilityRole="button" disabled={loading || !isValid || isSubmitting}>
                <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
              </TouchableOpacity>

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

            {/* Sign Up Section inside card */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/signup')} accessibilityRole="button">
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8ff',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 20,
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    // Android shadow
    elevation: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    paddingHorizontal: 8,
    paddingTop: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    fontSize: 16,
    color: '#6b7280',
  },
  signupLink: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorText: {
    color: '#E74C3C',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default Login;