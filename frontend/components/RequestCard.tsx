import React from "react";
import { View, Text } from "react-native";

export default function RequestCard({ request }: any) {
  return (
    <View style={{ padding: 12, borderBottomWidth: 1 }}>
      <Text style={{ fontWeight: "600" }}>{request.bloodType}</Text>
      <Text>{request.note}</Text>
    </View>
  );
}
