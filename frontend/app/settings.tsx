import React from "react";
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
import { useTheme } from "@/context/ThemeContext";

const PRIMARY = "#E53935";
const BG = "#FFFFFF";
const TEXT = "#111827";
const TEXT_MUTED = "#6B7280";
const CARD = "#FFFFFF";
const BORDER = "#E5E7EB";
const HIGHLIGHT = "#FDECEA";

function RowItem({
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress && !right}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color={PRIMARY} />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {right}
        {!right && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
      </View>
    </TouchableOpacity>
  );
}

export default function Settings() {
  const navigation = useNavigation<any>();
  const [pushNotifs, setPushNotifs] = React.useState(true);
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [locationAllowed, setLocationAllowed] = React.useState(true);
  const { isDark, toggleDark } = useTheme();
  const { user } = useAuth();
  const _roleLabel = String((user as any)?.role || 'Unknown');

  const _onLogout = () => {
    Alert.alert("Logout", "This is a UI-only action.");
  };
  const _onDelete = () => {
    Alert.alert("Delete Account", "This is a UI-only action.");
  };

  const BG_DARK = "#0F1115";
  const TEXT_DARK = "#F9FAFB";
  const TEXT_MUTED_DARK = "#9CA3AF";
  const CARD_DARK = "#1F2937";
  const BORDER_DARK = "#374151";
  const HIGHLIGHT_DARK = "#2A3647";

  const bg = isDark ? BG_DARK : BG;
  const text = isDark ? TEXT_DARK : TEXT;
  const _textMuted = isDark ? TEXT_MUTED_DARK : TEXT_MUTED;
  const card = isDark ? CARD_DARK : CARD;
  const border = isDark ? BORDER_DARK : BORDER;
  const _highlight = isDark ? HIGHLIGHT_DARK : HIGHLIGHT;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }] }>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={text} />
          <Text style={[styles.backText, { color: text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 12 }}>
        {/* Account */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: text }]}>Account</Text>
          <View style={[styles.group, { backgroundColor: card, borderColor: border }] }>
            {/* Removed role row per design focus */}
            <RowItem
              icon="person-circle-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => router.push('/editProfile')}
            />
            <View style={styles.separator} />
            <RowItem
              icon="key-outline"
              title="Change Password"
              subtitle="Update your password"
              onPress={() => router.push('/changePassword')}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: text }]}>Notifications</Text>
          <View style={[styles.group, { backgroundColor: card, borderColor: border }] }>
            <RowItem
              icon="notifications-outline"
              title="Push Notifications"
              subtitle="Receive notifications on your device"
              right={<Switch value={pushNotifs} onValueChange={setPushNotifs} />}
            />
            <View style={styles.separator} />
            <RowItem
              icon="mail-outline"
              title="Email Notifications"
              subtitle="Receive updates via email"
              right={<Switch value={emailNotifs} onValueChange={setEmailNotifs} />}
            />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: text }]}>Privacy & Access</Text>
          <View style={[styles.group, { backgroundColor: card, borderColor: border }] }>
            <RowItem
              icon="location-outline"
              title="Location Services"
              subtitle="Allow app to access your location"
              right={<Switch value={locationAllowed} onValueChange={setLocationAllowed} />}
            />
            <View style={styles.separator} />
            <RowItem icon="shield-outline" title="Privacy Policy" onPress={() => Alert.alert("Privacy Policy")} />
            <View style={styles.separator} />
            {/* Removed Terms per provided design */}
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: text }]}>Appearance</Text>
          <View style={[styles.group, { backgroundColor: card, borderColor: border }] }>
            <RowItem
              icon="moon-outline"
              title="Dark Mode"
              subtitle="Switch to dark theme"
              right={<Switch value={isDark} onValueChange={toggleDark} />}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: text }]}>Support</Text>
          <View style={[styles.group, { backgroundColor: card, borderColor: border }] }>
            <RowItem icon="help-circle-outline" title="Help Center" onPress={() => Alert.alert("Help Center")} />
            <View style={styles.separator} />
            {/* Simplified Support per design */}
            {/* AI Match Demo removed */}
          </View>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: text }]}>About</Text>
          <View style={[styles.group, { backgroundColor: card, borderColor: border }] }>
            <RowItem icon="information-circle-outline" title="App Version" subtitle="1.0.0" />
          </View>
        </View>

        {/* Danger Zone removed in design */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD,
    
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HIGHLIGHT,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    marginTop: 40
  },
  backText: { color: TEXT, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT },
  card: { paddingHorizontal: 12, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: TEXT, marginBottom: 10 },
  group: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    // subtle shadow to match design
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: HIGHLIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 17, fontWeight: "800", color: TEXT },
  rowSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  separator: { height: 1, backgroundColor: BORDER },
  // removed action buttons per design
});
