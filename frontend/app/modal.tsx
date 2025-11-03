import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ModalScreen() {
  const nav = useNavigation();
  return (
    <View style={s.container}>
      <Text style={s.title}>Modal</Text>
      <Text style={s.sub}>Simple modal screen for quick actions.</Text>
      <Button title="Close" onPress={() => nav.goBack()} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { color: "#666", marginVertical: 8 },
});
