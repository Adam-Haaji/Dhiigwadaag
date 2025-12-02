import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function TransparentModal() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={28} color="#E53935" />
          </View>
          <Text style={styles.title}>Important</Text>
          <Text style={styles.message}>
            This is a transparent modal placeholder. You can place any short description here.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  safe: { width: "100%", alignItems: "center", justifyContent: "center" },
  card: {
    width: "86%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FDECEA",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { marginTop: 12, fontSize: 18, fontWeight: "800", color: "#111827", textAlign: "center" },
  message: { marginTop: 8, fontSize: 14, color: "#6B7280", textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryTxt: { color: "#111827", fontWeight: "700" },
  primaryBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#E53935",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTxt: { color: "#FFFFFF", fontWeight: "700" },
});
