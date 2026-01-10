import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import colors, { semanticColors } from "../constants/colors";
import { useTheme } from '@/context/ThemeContext';
// No backend call here: navigation passes email to ResetPassword

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRx = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const isValidEmail = (v: string) => emailRx.test(v.trim());

  const handleResetPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setError(!trimmed ? 'Please enter your email address' : 'Enter a valid email');
      return;
    }
    setLoading(true);
    setError(null);
    // If you have a backend endpoint, call it here to send the code.
    // Navigate to verification screen with the email to enter the 6-digit code.
    router.push({ pathname: '/verification', params: { email: trimmed } });
    setLoading(false);
  };

  const { isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: semanticColors.bgAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={semanticColors.bgAlt} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: semanticColors.textPrimary }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Enter your email address and we&apos;ll send you a code to verify your Email.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }]}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Email Address *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle, color: semanticColors.textPrimary }]}
                placeholder="Enter your email"
                placeholderTextColor={semanticColors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.resetButton, (!isValidEmail(email) || loading) && { opacity: 0.6 }]}
              onPress={handleResetPassword}
              accessibilityRole="button"
              disabled={!isValidEmail(email) || loading}
            >
              <Text style={styles.resetButtonText}>{loading ? 'Sending…' : 'Send code'}</Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: semanticColors.textSecondary }]}>Remember your password? </Text>
              <TouchableOpacity onPress={() => router.push('/login')} accessibilityRole="button">
                <Text style={styles.loginLink}>Back to Login</Text>
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
  errorText: { marginTop: 8, color: '#D32F2F', fontSize: 12, fontWeight: '700' },
  resetButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  resetButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  loginContainer: { paddingTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 16 },
  loginLink: { color: colors.primary, fontWeight: '700' },
});

export default ForgotPassword;
