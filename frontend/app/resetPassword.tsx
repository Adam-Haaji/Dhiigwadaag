import React, { useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import colors, { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { notify } from '@/ui/feedback/notify';
import { MESSAGES } from '@/ui/feedback/messages';

const styles = {
  root: {
    flex: 1 as const,
  },

  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  centerContent: {
    flexGrow: 1 as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  headerWrap: {
    alignItems: 'center' as const,
    marginTop: 0,
    marginBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '900' as const,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800' as const,
    textAlign: 'center' as const,
  },

  accountText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '900' as const,
    textAlign: 'center' as const,
  },

  card: {
    marginTop: 18,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    // Android elevation
    elevation: 0,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
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
  },

  errorText: {
    marginTop: 6,
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '700' as const,
  },

  fieldGap: { height: 18 },

  actionBtn: {
    marginTop: 26,
    height: 56,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '800' as const,
  },

  showHideBtn: {
    position: 'absolute' as const,
    right: 12,
    top: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  showHideText: {
    fontWeight: '800' as const,
  },
} as const;

type Props = {
  email?: string; // show the account line under the subtitle
};

export default function ResetPasswordScreen({ email }: Props) {
  const { isDark: _isDark } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  if (!email && params?.email && typeof params.email === 'string') {
    email = params.email;
  }
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [errors, setErrors] = useState<{ [k: string]: string | undefined }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!newPass.trim()) next.new = 'Please enter a new password';
    else if (newPass.length < 6) next.new = 'Password must be at least 6 characters';
    if (!confirmPass.trim()) next.confirm = 'Please confirm your new password';
    else if (confirmPass !== newPass) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onReset = () => {
    if (!validate()) return;
    // TODO: call reset password API with token
    notify.success(MESSAGES.password.reset.success.title, MESSAGES.password.reset.success.body);
    setNewPass('');
    setConfirmPass('');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: semanticColors.bgAlt }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
        {/* Title and captions */}
        <View style={styles.headerWrap}>
          <Text style={[styles.title, { color: semanticColors.textPrimary }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Enter your new password</Text>
          {email ? (
            <Text style={[styles.accountText, { color: semanticColors.textMuted }]}>Account: {email}</Text>
          ) : null}
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
          {/* New Password */}
          <Text style={[styles.label, { color: semanticColors.textPrimary }]}>New Password</Text>
          <View>
            <TextInput
              placeholder="New Password"
              placeholderTextColor={semanticColors.textMuted}
              secureTextEntry={secureNew}
              value={newPass}
              onChangeText={setNewPass}
              style={[styles.input, { backgroundColor: semanticColors.bgSurface, color: semanticColors.textPrimary, borderWidth: 1, borderColor: semanticColors.borderSubtle }]}
              returnKeyType="next"
            />
            <TouchableOpacity
              onPress={() => setSecureNew((s) => !s)}
              style={styles.showHideBtn}
            >
              <Text style={[styles.showHideText, { color: semanticColors.textMuted }]}>{secureNew ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          </View>
          {!!errors.new && <Text style={styles.errorText}>{errors.new}</Text>}

          <View style={styles.fieldGap} />

          {/* Confirm New Password */}
          <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Confirm New Password</Text>
          <View>
            <TextInput
              placeholder="Confirm New Password"
              placeholderTextColor={semanticColors.textMuted}
              secureTextEntry={secureConfirm}
              value={confirmPass}
              onChangeText={setConfirmPass}
              style={[styles.input, { backgroundColor: semanticColors.bgSurface, color: semanticColors.textPrimary, borderWidth: 1, borderColor: semanticColors.borderSubtle }]}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => setSecureConfirm((s) => !s)}
              style={styles.showHideBtn}
            >
              <Text style={[styles.showHideText, { color: semanticColors.textMuted }] }>
                {secureConfirm ? 'Show' : 'Hide'}
              </Text>
            </TouchableOpacity>
          </View>
          {!!errors.confirm && (
            <Text style={styles.errorText}>{errors.confirm}</Text>
          )}

          {/* Reset button */}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.palette.brandBright }]} onPress={onReset}>
            <Text style={[styles.actionText, { color: semanticColors.textInverse }]}>Reset Password</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
