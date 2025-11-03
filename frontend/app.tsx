// frontend/index.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Layout from "./app/_layout";
import Login from "./app/login";
import Signup from "./app/signup";
import Onboarding1 from "./app/onboarding1";
import CreateRequest from "./app/createRequest";
import ModalScreen from "./app/modal";
import { AuthProvider } from "./context/AuthContext";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding1" component={Onboarding1} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Signup" component={Signup} />
          <Stack.Screen name="Layout" component={Layout} />
          <Stack.Group screenOptions={{ presentation: "modal" }}>
            <Stack.Screen name="CreateRequest" component={CreateRequest} />
            <Stack.Screen name="Modal" component={ModalScreen} />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
