import React, { useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '@/components/Button';
import { semanticColors, radii, spacing } from '@/constants/colors';
import { fontFamilies } from '@/constants/fonts';
import { moderateScale, responsiveFont } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type Params = { email?: string };

export default function VerificationScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<Params>();
  const email = useMemo(() => (typeof params?.email === 'string' ? params.email : ''), [params]);

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

  const code = useMemo(() => digits.join(''), [digits]);

  const focusIndex = (idx: number) => {
    const ref = inputs[idx]?.current;
    ref?.focus();
  };

  const onChangeDigit = (idx: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 1); // only one numeric char
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    setError(null);
    if (v && idx < 5) focusIndex(idx + 1);
    // Auto-verify when all 6 digits present
    if (next.every((d) => d.length === 1)) {
      verifyCode(next.join(''));
    }
  };

  const onKeyPress = (idx: number, e: any) => {
    if (e?.nativeEvent?.key === 'Backspace') {
      if (digits[idx]) {
        // clear current
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        focusIndex(idx - 1);
      }
    }
  };

  const verifyCode = async (c?: string) => {
    const val = (c ?? code).trim();
    if (!/^\d{6}$/.test(val)) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    try {
      setLoading(true);
      // TODO: Integrate with backend verification endpoint, e.g., /api/auth/verify-reset-code
      // For now, accept any 6-digit code and navigate to Reset Password.
      router.push({ pathname: '/resetPassword', params: { email } });
    } catch (e: any) {
      setError(e?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      setLoading(true);
      // TODO: Call backend to resend code to the given email
      // Example: await api.post('/api/auth/forgot-password', { email })
      await new Promise((r) => setTimeout(r, 800));
      Alert.alert('Code Sent', 'A new verification code has been sent.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to resend code');
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: semanticColors.bgAlt },
        kav: { flex: 1 },
        centerContent: {
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: moderateScale(24),
          paddingBottom: moderateScale(24),
        },
        header: { alignItems: 'center', marginBottom: moderateScale(16) },
        title: { fontSize: responsiveFont(28), fontFamily: fontFamilies.bold, color: semanticColors.textPrimary },
        subtitle: {
          fontSize: responsiveFont(16),
          fontFamily: fontFamilies.medium,
          marginTop: moderateScale(6),
          textAlign: 'center',
          color: semanticColors.textSecondary,
        },
        account: { fontSize: responsiveFont(13), fontFamily: fontFamilies.medium, marginTop: moderateScale(6), color: semanticColors.textMuted },
        card: {
          borderRadius: radii.lg,
          paddingHorizontal: moderateScale(spacing.lg),
          paddingVertical: moderateScale(spacing.lg),
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          borderWidth: Platform.OS === 'android' ? 0 : 1,
          backgroundColor: semanticColors.bgSurface,
          borderColor: semanticColors.borderSubtle,
        },
        codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: moderateScale(spacing.md) },
        codeBox: {
          width: BOX_SIZE,
          height: BOX_SIZE,
          textAlign: 'center',
          borderWidth: 1,
          borderColor: semanticColors.borderSubtle,
          backgroundColor: semanticColors.bgSurface,
          borderRadius: radii.md,
          fontFamily: fontFamilies.semibold,
          fontSize: responsiveFont(20),
          color: semanticColors.textPrimary,
        },
        error: {
          marginTop: moderateScale(spacing.sm),
          color: semanticColors.interactiveDanger,
          fontFamily: fontFamilies.medium,
          fontSize: responsiveFont(12),
        },
        actions: { marginTop: moderateScale(spacing.lg) },
      }),
    [isDark]
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={semanticColors.bgAlt} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify Your Account</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to your Gmail.</Text>
            {!!email && (
              <Text style={styles.account}>We sent a code to {email}</Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.codeRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={inputs[i]}
                  value={d}
                  onChangeText={(v) => onChangeDigit(i, v)}
                  onKeyPress={(e) => onKeyPress(i, e)}
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  returnKeyType={i === 5 ? 'done' : 'next'}
                  maxLength={1}
                  style={styles.codeBox}
                  placeholder="•"
                  placeholderTextColor={semanticColors.textMuted}
                  selectionColor={semanticColors.interactivePrimary}
                  cursorColor={semanticColors.interactivePrimary}
                />
              ))}
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <Button title={loading ? 'Verifying…' : 'Verify Code'} onPress={() => verifyCode()} disabled={loading} />
              <View style={{ height: moderateScale(spacing.sm) }} />
              <Button title="Resend code" variant="ghost" onPress={resendCode} disabled={loading} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BOX_SIZE = moderateScale(50);
