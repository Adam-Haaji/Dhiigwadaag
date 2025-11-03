import React from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";

export default function ResetPassword({ navigation }: any) {
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");

  const doReset = () => {
    Alert.alert("Password reset", "Your password has been reset (mock)");
    navigation.navigate("Login" as any);
  };

  return (
    <View style={s.container}>
      <TextInput placeholder="Code" value={code} onChangeText={setCode} style={s.input} />
      <TextInput placeholder="New password" secureTextEntry value={password} onChangeText={setPassword} style={s.input} />
      <Button title="Reset Password" onPress={doReset} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "#fff" },
  input: { borderWidth: 1, borderColor: "#eee", padding: 12, borderRadius: 8, marginBottom: 12 },
});
