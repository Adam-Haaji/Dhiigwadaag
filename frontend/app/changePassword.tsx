import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import api from '@/service/api';

export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [secureOld, setSecureOld] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [errors, setErrors] = useState<{ [k: string]: string | undefined }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!oldPass.trim()) next.old = 'Please enter your current password';
    if (!newPass.trim()) next.new = 'Please enter a new password';
    else if (newPass.length < 6) next.new = 'Password must be at least 6 characters';
    if (!confirmPass.trim()) next.confirm = 'Please confirm your new password';
    else if (confirmPass !== newPass) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onChangePassword = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await (api as any).changePassword({ oldPassword: oldPass, newPassword: newPass });
      Alert.alert('Success', 'Password changed');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: semanticColors.bgAlt,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 12,
    },
    backText: { fontWeight: '700' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    centerContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerWrap: { alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '900' },
    subtitle: { marginTop: 8, fontSize: 15, fontWeight: '800', textAlign: 'center' },
    card: {
      marginTop: 18,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 16,
      shadowColor: semanticColors.cardShadow,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      borderWidth: 1,
    },
    label: { fontWeight: '900', fontSize: 16, marginBottom: 8 },
    input: {
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: Platform.OS === 'ios' ? 16 : 12,
      fontSize: 16,
      fontWeight: '700',
    },
    errorText: { marginTop: 6, fontSize: 12, fontWeight: '700' },
    fieldGap: { height: 18 },
    actionBtn: {
      marginTop: 26,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: { fontSize: 18, fontWeight: '800' },
    showHideBtn: { position: 'absolute', right: 12, top: Platform.OS === 'ios' ? 10 : 6, paddingHorizontal: 8, paddingVertical: 8 },
    showHideText: { fontWeight: '800' },
  }), [isDark, submitting]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: semanticColors.bgAlt }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { backgroundColor: semanticColors.bgSurface, borderBottomColor: semanticColors.borderSubtle }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={semanticColors.textPrimary} />
          <Text style={[styles.backText, { color: semanticColors.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: semanticColors.textPrimary }]}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerWrap}>
            <Text style={[styles.title, { color: semanticColors.textPrimary }]}>Change Password</Text>
            <Text style={[styles.subtitle, { color: semanticColors.textSecondary }]}>Enter your current and new password</Text>
          </View>

          <View style={[styles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }]}>
            {/* Current Password */}
            <Text style={[styles.label, { color: semanticColors.textPrimary }]}>Current Password</Text>
            <View>
              <TextInput
                placeholder="Current Password"
                placeholderTextColor={semanticColors.textMuted}
                secureTextEntry={secureOld}
                value={oldPass}
                onChangeText={setOldPass}
                style={[styles.input, { backgroundColor: semanticColors.bgSurface, color: semanticColors.textPrimary, borderWidth: 1, borderColor: semanticColors.borderSubtle }]}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setSecureOld((s) => !s)} style={styles.showHideBtn}>
                <Text style={[styles.showHideText, { color: semanticColors.textMuted }]}>{secureOld ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>
            {!!errors.old && <Text style={[styles.errorText, { color: semanticColors.interactiveDanger }]}>{errors.old}</Text>}

            <View style={styles.fieldGap} />

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
              <TouchableOpacity onPress={() => setSecureNew((s) => !s)} style={styles.showHideBtn}>
                <Text style={[styles.showHideText, { color: semanticColors.textMuted }]}>{secureNew ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>
            {!!errors.new && <Text style={[styles.errorText, { color: semanticColors.interactiveDanger }]}>{errors.new}</Text>}

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
              <TouchableOpacity onPress={() => setSecureConfirm((s) => !s)} style={styles.showHideBtn}>
                <Text style={[styles.showHideText, { color: semanticColors.textMuted }]}>{secureConfirm ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>
            {!!errors.confirm && <Text style={[styles.errorText, { color: semanticColors.interactiveDanger }]}>{errors.confirm}</Text>}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: semanticColors.interactivePrimary, opacity: submitting ? 0.7 : 1 }]}
              onPress={onChangePassword}
              disabled={submitting}
            >
              <Text style={[styles.actionText, { color: semanticColors.textInverse }]}>{submitting ? 'Changing…' : 'Change Password'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
