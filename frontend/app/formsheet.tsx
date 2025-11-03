import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function FormSheet() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Form Sheet</Text>
      <Text style={s.sub}>This is a placeholder for modal forms or quick input sheets.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff", flex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  sub: { color: "#666", marginTop: 6 },
});
