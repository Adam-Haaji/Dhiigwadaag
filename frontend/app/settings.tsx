import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useAuth from "@/hooks/useAuth";

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
  const [darkMode, setDarkMode] = React.useState(false);
  const { user } = useAuth();
  const roleLabel = String((user as any)?.role || 'Unknown');

  const onLogout = () => {
    Alert.alert("Logout", "This is a UI-only action.");
  };
  const onDelete = () => {
    Alert.alert("Delete Account", "This is a UI-only action.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.group}>
            <RowItem
              icon="pricetag-outline"
              title="Your Role"
              subtitle={roleLabel}
            />
            <View style={styles.separator} />
            <RowItem
              icon="person-circle-outline"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => navigation.navigate("EditProfile" as never)}
            />
            <View style={styles.separator} />
            <RowItem
              icon="key-outline"
              title="Change Password"
              subtitle="Update your password"
              onPress={() => navigation.navigate("ResetPassword" as never)}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.group}>
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
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.group}>
            <RowItem
              icon="location-outline"
              title="Location Services"
              subtitle="Allow app to access your location"
              right={<Switch value={locationAllowed} onValueChange={setLocationAllowed} />}
            />
            <View style={styles.separator} />
            <RowItem icon="shield-outline" title="Privacy Policy" onPress={() => Alert.alert("Privacy Policy")} />
            <View style={styles.separator} />
            <RowItem icon="document-text-outline" title="Terms of Service" onPress={() => Alert.alert("Terms")} />
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.group}>
            <RowItem
              icon="moon-outline"
              title="Dark Mode"
              subtitle="Switch to dark theme"
              right={<Switch value={darkMode} onValueChange={setDarkMode} />}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.group}>
            <RowItem icon="help-circle-outline" title="Help Center" onPress={() => Alert.alert("Help Center")} />
            <View style={styles.separator} />
            <RowItem icon="mail-open-outline" title="Contact Us" onPress={() => Alert.alert("Contact Us")} />
            <View style={styles.separator} />
            <RowItem icon="star-outline" title="Rate App" onPress={() => Alert.alert("Rate App")} />
            <View style={styles.separator} />
            {/* AI Match Demo removed */}
          </View>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.group}>
            <RowItem icon="information-circle-outline" title="App Version" subtitle="1.0.0" />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.outlineBtn} onPress={onLogout}>
            <Text style={[styles.outlineTxt, { color: PRIMARY }]}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={onDelete}>
            <Text style={styles.dangerTxt}>Delete Account</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  card: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 10 },
  group: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
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
    backgroundColor: HIGHLIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: TEXT },
  rowSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  separator: { height: 1, backgroundColor: "#F3F4F6" },
  actions: { paddingHorizontal: 20, marginTop: 24, gap: 12 },
  outlineBtn: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  outlineTxt: { fontSize: 16, fontWeight: "700" },
  dangerBtn: { backgroundColor: PRIMARY, borderRadius: 12, alignItems: "center", paddingVertical: 14 },
  dangerTxt: { color: BG, fontSize: 16, fontWeight: "700" },
});
