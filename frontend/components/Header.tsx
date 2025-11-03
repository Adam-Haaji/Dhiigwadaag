import React from "react";
import { View, Text } from "react-native";

export default function Header({ title }: { title: string }) {
  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: 20 }}>{title}</Text>
    </View>
  );
}
