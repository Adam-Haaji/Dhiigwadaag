import React, { useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';



export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [secureOld, setSecureOld] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [errors, setErrors] = useState<{ [k: string]: string | undefined }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!oldPass.trim()) next.old = 'Please enter your old password';
    if (!newPass.trim()) next.new = 'Please enter a new password';
    else if (newPass.length < 6) next.new = 'Password must be at least 6 characters';
    if (!confirmPass.trim()) next.confirm = 'Please confirm your new password';
    else if (confirmPass !== newPass) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onChangePassword = () => {
    if (!validate()) return;
    // TODO: call your API here
    Alert.alert('Success', 'Password changed');
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header matching Settings style */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={'#111827'} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 12 }]}>
        <View style={styles.spacer20} />
        <Text style={styles.subtitle}>Enter your current and new password</Text>
        <View style={styles.spacer16} />

        <View style={styles.card}>
          {/* Old Password */}
          <Text style={styles.label}>Old Password</Text>
          <View>
            <TextInput
              placeholder="Old Password"
              placeholderTextColor={COLORS.hint}
              secureTextEntry={secureOld}
              value={oldPass}
              onChangeText={setOldPass}
              style={styles.input}
              returnKeyType="next"
            />
            <TouchableOpacity
              onPress={() => setSecureOld((s) => !s)}
              style={styles.showHideBtn}
            >
              <Text style={styles.showHideText}>{secureOld ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          </View>
          {!!errors.old && <Text style={styles.errorText}>{errors.old}</Text>}

          <View style={styles.fieldGap} />

          {/* New Password */}
          <Text style={styles.label}>New Password</Text>
          <View>
            <TextInput
              placeholder="New Password"
              placeholderTextColor={COLORS.hint}
              secureTextEntry={secureNew}
              value={newPass}
              onChangeText={setNewPass}
              style={styles.input}
              returnKeyType="next"
            />
            <TouchableOpacity
              onPress={() => setSecureNew((s) => !s)}
              style={styles.showHideBtn}
            >
              <Text style={styles.showHideText}>{secureNew ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          </View>
          {!!errors.new && <Text style={styles.errorText}>{errors.new}</Text>}

          <View style={styles.fieldGap} />

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View>
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={COLORS.hint}
              secureTextEntry={secureConfirm}
              value={confirmPass}
              onChangeText={setConfirmPass}
              style={styles.input}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => setSecureConfirm((s) => !s)}
              style={styles.showHideBtn}
            >
              <Text style={styles.showHideText}>{secureConfirm ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          </View>
          {!!errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}

          {/* Change Password Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={onChangePassword}>
            <Text style={styles.saveText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer24} />
      </ScrollView>
    </SafeAreaView>
  );
}
const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  label: '#303645',
  caption: '#6B7280',
  hint: '#9AA4B2',
  muted: '#687081',
  fieldFill: '#F3F6FA',
  red: '#FF4B4B',
  cardBorder: '#EEF2F6',
};

const styles = {
  root: {
    flex: 1 as const,
    backgroundColor: COLORS.white,
  },
  appBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    height: 56,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  backBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: '#FDECEA',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    marginTop: 40
  },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#111827' },
  appBarLeading: {
    position: 'absolute' as const,
    left: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backIcon: {
    fontSize: 18,
    color: COLORS.black,
    marginRight: 2,
  },
  backText: {
    fontWeight: '700' as const,
    color: COLORS.black,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.black,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  spacer20: { height: 20 },
  spacer16: { height: 16 },
  spacer24: { height: 24 },

  subtitle: {
    textAlign: 'center' as const,
    color: COLORS.caption,
    fontWeight: '900' as const,
    fontSize: 16,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    // iOS shadow
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // Android elevation
    elevation: 4,
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: COLORS.cardBorder,
  },

  label: {
    color: COLORS.label,
    fontWeight: '900' as const,
    fontSize: 16,
    marginBottom: 8,
  },

  input: {
    backgroundColor: COLORS.fieldFill,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.black,
  },

  errorText: {
    marginTop: 6,
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '700' as const,
  },

  fieldGap: { height: 18 },

  saveBtn: {
    marginTop: 26,
    backgroundColor: COLORS.red,
    height: 56,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  saveText: {
    color: COLORS.white,
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
    color: COLORS.muted,
    fontWeight: '800' as const,
  },
} as const;
