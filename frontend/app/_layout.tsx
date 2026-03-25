import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Platform, LogBox, View } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { deactivateKeepAwake } from 'expo-keep-awake';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { semanticColors } from '../constants/colors';
import { useNotificationSetup } from '../hooks/useNotification';
import { initLanguage } from '@/ui/i18n';
import CenterToastProvider from '@/ui/toast/CenterToastProvider';

function InnerLayout() {
  // Workaround: Some Android devices throw "Unable to activate keep awake" in Expo Go.
  // We disable keep-awake in dev and silence the noisy log so it doesn't break DX.
  useEffect(() => {
    if (__DEV__ && Platform.OS === 'android') {
      // Try to deactivate if auto-activated by expo-router dev entry
      deactivateKeepAwake().catch(() => {});
      // Hide the redbox/noisy log line if it still occurs
      LogBox.ignoreLogs([
        "Unable to activate keep awake",
        "contains an invalid package.json configuration",
        "Libraries/Utilities/LoadingView"
      ]);
    }
  }, []);

  useEffect(() => {
    // Initialize saved app language for localized toasts (EN/SO).
    initLanguage().catch(() => {});
  }, []);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Register notification response handler once at app root
  useNotificationSetup();

  const { isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: semanticColors.bgAlt }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <CenterToastProvider>
        {fontsLoaded && <Stack screenOptions={{ headerShown: false }} />}
      </CenterToastProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
