import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useAuth from "@/hooks/useAuth";
import api from "@/service/api";
import { registerForPushNotificationsAsync } from "@/service/notificationService";
import Constants from 'expo-constants';
import { semanticColors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

function RowItem({
  icon,
  title,
  subtitle,
  onPress,
  right,
  s,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  s: any;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} disabled={!onPress && !right}>
      <View style={s.rowLeft}>
        <View style={s.iconWrap}>
          <Ionicons name={icon} size={18} color={semanticColors.interactivePrimary} />
        </View>
        <View>
          <Text style={[s.rowTitle, { color: semanticColors.textPrimary }]}>{title}</Text>
          {subtitle ? <Text style={[s.rowSubtitle, { color: semanticColors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={s.rowRight}>
        {right}
        {!right && <Ionicons name="chevron-forward" size={18} color={semanticColors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

export default function Settings() {
  const navigation = useNavigation<any>();
  const [pushNotifs, setPushNotifs] = React.useState(true);
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [locationAllowed, setLocationAllowed] = React.useState(true);
  const { isDark, setDark } = useTheme();
  const { user } = useAuth();
  const roleLabel = String((user as any)?.role || 'Unknown');
  const version = (Constants?.expoConfig?.version
    || (Constants as any)?.manifest?.version
    || 'Unknown');

  const onLogout = () => {
    Alert.alert("Logout", "This is a UI-only action.");
  };
  const onDelete = () => {
    Alert.alert("Delete Account", "This is a UI-only action.");
  };

  // Load preferences from backend
  React.useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        if (typeof me?.pushNotificationsEnabled === 'boolean') setPushNotifs(me.pushNotificationsEnabled);
        if (typeof me?.emailNotificationsEnabled === 'boolean') setEmailNotifs(me.emailNotificationsEnabled);
      } catch {}
    })();
  }, []);

  const onTogglePush = async (val: boolean) => {
    setPushNotifs(val);
    try {
      await api.updateMe({ pushNotificationsEnabled: val });
      if (val) {
        await registerForPushNotificationsAsync();
      }
    } catch (e: any) {
      setPushNotifs(!val);
      Alert.alert('Error', e?.message || 'Failed to update push notifications');
    }
  };

  const onToggleEmail = async (val: boolean) => {
    setEmailNotifs(val);
    try {
      await api.updateMe({ emailNotificationsEnabled: val });
    } catch (e: any) {
      setEmailNotifs(!val);
      Alert.alert('Error', e?.message || 'Failed to update email notifications');
    }
  };

  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: semanticColors.bgAlt,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    card: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
    group: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: semanticColors.bgAlt,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: { fontSize: 16, fontWeight: "600" },
    rowSubtitle: { fontSize: 12, marginTop: 2 },
    rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    separator: { height: 1 },
    actions: { paddingHorizontal: 20, marginTop: 24, gap: 12 },
    outlineBtn: {
      borderWidth: 1,
      borderColor: semanticColors.interactivePrimary,
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 14,
    },
    outlineTxt: { fontSize: 16, fontWeight: "700" },
    dangerBtn: { backgroundColor: semanticColors.interactivePrimary, borderRadius: 12, alignItems: "center", paddingVertical: 14 },
    dangerTxt: { color: semanticColors.textInverse, fontSize: 16, fontWeight: "700" },
  }), [isDark]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: semanticColors.bgAlt }]}>
      <View style={[s.header, { backgroundColor: semanticColors.bgSurface, borderBottomColor: semanticColors.borderSubtle }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={semanticColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: semanticColors.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Account */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, { color: semanticColors.textPrimary }]}>Account</Text>
          <View style={[s.group, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
            <RowItem
              icon="person-circle-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => router.push('/editProfile')}
              s={s}
            />
            <View style={[s.separator, { backgroundColor: semanticColors.borderSubtle }]} />
            <RowItem
              icon="key-outline"
              title="Change Password"
              subtitle="Update your password"
              onPress={() => router.push('/changePassword')}
              s={s}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, { color: semanticColors.textPrimary }]}>Notifications</Text>
          <View style={[s.group, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
            <RowItem
              icon="notifications-outline"
              title="Push Notifications"
              subtitle="Receive notifications on your device"
              right={<Switch value={pushNotifs} onValueChange={onTogglePush} />}
              s={s}
            />
            <View style={[s.separator, { backgroundColor: semanticColors.borderSubtle }]} />
            <RowItem
              icon="mail-outline"
              title="Email Notifications"
              subtitle="Receive updates via email"
              right={<Switch value={emailNotifs} onValueChange={onToggleEmail} />}
              s={s}
            />
          </View>
        </View>

        {/* Privacy */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, { color: semanticColors.textPrimary }]}>Privacy</Text>
          <View style={[s.group, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
            <RowItem icon="shield-outline" title="Privacy" onPress={() => router.push('/privacy')} s={s} />
          </View>
        </View>

        {/* Appearance */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, { color: semanticColors.textPrimary }]}>Appearance</Text>
          <View style={[s.group, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
            <RowItem
              icon="moon-outline"
              title="Dark Mode"
              subtitle="Switch to dark theme"
              right={<Switch value={isDark} onValueChange={setDark} />}
              s={s}
            />
          </View>
        </View>

        {/* Support */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, { color: semanticColors.textPrimary }]}>Support</Text>
          <View style={[s.group, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
            <RowItem icon="help-circle-outline" title="Help Center" onPress={() => router.push('/help')} s={s} />
            <View style={[s.separator, { backgroundColor: semanticColors.borderSubtle }]} />
            <RowItem icon="mail-open-outline" title="Contact Us" onPress={() => router.push('/contact')} s={s} />
            {/* Trimmed to only requested items */}
          </View>
        </View>

        {/* About */}
        <View style={s.card}>
          <Text style={[s.sectionTitle, { color: semanticColors.textPrimary }]}>About</Text>
          <View style={[s.group, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }] }>
            <RowItem icon="information-circle-outline" title="App Version" subtitle={`v${version}`} s={s} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

