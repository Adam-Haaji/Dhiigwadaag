import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { semanticColors, spacing, typography } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

/**
 * Informational-only notification view.
 * Shows only title and message. No donor details, no contact actions.
 * Used for "Donor Matched" and "Donor Accepted" so donor identity stays hidden until Fulfilled.
 */
export default function NotificationMessage() {
  const params = useLocalSearchParams<{ payload?: string }>();
  const { isDark } = useTheme();
  const { title, message } = useMemo(() => {
    try {
      const p = params?.payload ? JSON.parse(params.payload as string) : {};
      return {
        title: p?.title ?? 'Notification',
        message: p?.message ?? '',
      };
    } catch {
      return { title: 'Notification', message: '' };
    }
  }, [params?.payload]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt, padding: spacing.lg },
    card: {
      backgroundColor: semanticColors.bgSurface,
      borderRadius: 12,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: semanticColors.borderSubtle,
    },
    title: { ...typography.h3, color: semanticColors.textPrimary, marginBottom: spacing.md },
    message: { ...typography.body, color: semanticColors.textSecondary, lineHeight: 22 },
  }), [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message || 'No additional details.'}</Text>
      </View>
    </SafeAreaView>
  );
}
