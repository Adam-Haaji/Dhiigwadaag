import React, { useEffect } from "react";
import { Platform, LogBox } from "react-native";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { deactivateKeepAwake } from "expo-keep-awake";

export default function RootLayout() {
  // Workaround: Some Android devices throw "Unable to activate keep awake" in Expo Go.
  // We disable keep-awake in dev and silence the noisy log so it doesn't break DX.
  useEffect(() => {
    if (__DEV__ && Platform.OS === 'android') {
      // Try to deactivate if auto-activated by expo-router dev entry
      deactivateKeepAwake().catch(() => {});
      // Hide the redbox/noisy log line if it still occurs
      LogBox.ignoreLogs(["Unable to activate keep awake"]);
    }
  }, []);
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
