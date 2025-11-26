import React from 'react';
import { View, Text } from 'react-native';

// Diagnostics screen disabled: AI model endpoints may be offline in local dev.
// This screen is intentionally inert to avoid accidental API calls.
export default function DiagnosticsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        Diagnostics disabled
      </Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        This page has been disabled to prevent calling unavailable AI endpoints during development.
        Use the matching flow in the app or enable the AI service to test /predict and /rank.
      </Text>
    </View>
  );
}
