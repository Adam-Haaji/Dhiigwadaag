import React from "react";
import { View, Text } from "react-native";

export default function DonorCard({ donor }: any) {
  return (
    <View style={{ padding: 12, borderBottomWidth: 1 }}>
      <Text style={{ fontWeight: "600" }}>{donor.name}</Text>
      <Text>{donor.bloodType} • {donor.location?.lat},{donor.location?.lng}</Text>
    </View>
  );
}
