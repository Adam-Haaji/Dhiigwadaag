import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import colors, { semanticColors, spacing, typography } from "../constants/colors";
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import SectionCard from '@/components/SectionCard';
import apiClient from "../service/api";
import useAuthHook from "../hooks/useAuth";
import { useTheme } from '@/context/ThemeContext';

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
      
      // Check if user has requester record (regardless of role)
      try {
        const meReq = await apiClient.requesterMe();
        if (meReq?.exists) {
          router.replace('/(home)/request');
          return;
        }
      } catch {}
      
      // Check if user has donor record (using correct API)
      try {
        const donorData = await apiClient.donorMe();
        if (donorData?.exists) {
          router.replace('/(home)/donor');
          return;
        }
      } catch {}
      
      // If normal user (no donor/requester records), show role selection page
      if (role === 'user' || role === 'none') {
        router.replace('/role');
      } else if (role === 'admin') {
        router.replace('/(home)');
      } else {
        // Default: show role selection for any other case
        router.replace('/role');
      }
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  

  const { isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: semanticColors.bgAlt }] }>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={semanticColors.bgAlt} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: semanticColors.textPrimary }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Sign in to continue</Text>
          </View>

          {/* Card with form */}
          <SectionCard>
            {/* Email/Phone Input */}
            <View style={styles.inputContainer}>
              <Controller control={control} name="email"
                rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
                render={({ field }: any) => (
                  <AppInput
                    label="Email"
                    placeholder="Email"
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
              <Controller control={control} name="password"
                rules={{ required: true, minLength: 6 }}
                render={({ field }: any) => (
                  <AppInput
                    label="Password"
                    placeholder="Password"
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
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
              <AppButton
                title={loading ? 'Logging in...' : 'Login'}
                onPress={handleSubmit(onSubmit)}
                disabled={loading || !isValid || isSubmitting}
                loading={loading}
                variant="primary"
              />

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

            {/* Sign Up Section inside card */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: semanticColors.textSecondary }]}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/signup')} accessibilityRole="button">
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 24,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    ...typography.caption,
    color: colors.primary,
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
    ...typography.bodySmall,
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