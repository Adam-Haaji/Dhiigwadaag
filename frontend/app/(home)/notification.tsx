import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import api from '../../service/api';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '@/hooks/useAuth';

// Lazy-load LinearGradient to avoid type resolution issues in some setups
let LinearGradient: any;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  LinearGradient = View;
}

// Unified notifications screen: no per-scope tabs or filters

// Shadows
const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
});

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 3 },
});

export default function NotificationScreen() {
  const { user } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await api.myNotifications();
      const shaped = list.map((n: any) => ({
        id: n._id,
        type: (n.type || '').toString().toLowerCase(),
        title: n.title,
        message: n.message,
        createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        read: n.read,
        urgent: !!n.urgent,
        source: n?.meta?.source,
        requestId: n?.meta?.requestId,
        requesterName: n?.meta?.requesterName,
        requesterBloodType: n?.meta?.requesterBloodType,
        requesterPhone: n?.meta?.requesterPhone,
        urgency: n?.meta?.urgency,
      }));
      // Show all notifications to donors so matched "request" alerts appear
      const roleFiltered = shaped.filter((n: any) => {
        if (role === 'donor') return true;
        if (role === 'requester') return n.type === 'request' || n.type === 'message' || n.type === 'system';
        return true; // both/admin/unknown -> show all
      });
      roleFiltered.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotifications(roleFiltered);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let timer: any;
      (async () => {
        await load();
        timer = setInterval(load, 5000);
      })();
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [])
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request':
        return 'drop.fill';
      case 'donation':
        return 'heart.fill';
      case 'message':
        return 'message.fill';
      case 'system':
        return 'gear.circle.fill';
      default:
        return 'bell.fill';
    }
  };

  const getTypeLabel = (type: string) => {
    const t = String(type || '').toLowerCase();
    if (t === 'request') return 'Request';
    if (t === 'donation') return 'Donor';
    if (t === 'message') return 'Message';
    if (t === 'system') return 'System';
    return 'Notice';
  };

  const getNotificationColor = (type: string, urgent: boolean) => {
    if (urgent) return colors.error;
    switch (type) {
      case 'request':
        return colors.primary;
      case 'donation':
        return colors.success;
      case 'message':
        return colors.secondary;
      case 'system':
        return colors.textSecondary;
      default:
        return colors.primary;
    }
  };

  // New design data shaping
  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = notifications; // already filtered by role and sorted

  return (
    <SafeAreaView style={styles.safe}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: 'Notifications',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
      )}

      <View style={styles.container}>
        {/* Header - New Design (card-like gradient) */}
        <LinearGradient
          colors={[colors.primary, '#C40F45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerCard, shadow as any]}
        >
          <View style={styles.headerRow}>
            <IconSymbol name="bell.fill" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>Stay updated</Text>
            </View>

            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Unified list; no tabs or filters */}

          {/* Removed dev helper displaying API base URL for security */}

          {/* List */}
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="bell.slash" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No notifications found</Text>
              <Text style={styles.emptyStateSubtext}>Check back later for updates</Text>
            </View>
          ) : (
            <View>
              {filtered.map((notification) => {
                const showUrgent = notification.urgent || String(notification.urgency || '').toLowerCase() === 'urgent' || String(notification.urgency || '').toLowerCase() === 'critical';
                const badgeText =
                  showUrgent ? 'Urgent' : !notification.read ? 'New' : undefined;

                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[styles.card, cardShadow as any]}
                    onPress={async () => {
                      try {
                        await api.markOneRead(notification.id);
                      } catch {}
                      if (notification.type === 'request' && notification.requestId) {
                        const target = (notification as any)?.source || (notification as any)?.meta?.source;
                        // Donor notifications should open matched details with donor view to avoid Forbidden
                        const role = String(user?.user?.role || '').toLowerCase();
                        if (role === 'donor') {
                          router.push({ pathname: '/matchedRequestDetail', params: { id: String(notification.requestId), mode: 'donor' } });
                        } else if (target === 'blood-request') {
                          router.push({ pathname: '/requestStatus', params: { id: String(notification.requestId) } });
                        } else {
                          router.push({ pathname: '/requestDetail', params: { id: String(notification.requestId) } });
                        }
                      }
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {notification.title}
                      </Text>
                      <View style={styles.typeTag}><Text style={styles.typeTagText}>{getTypeLabel(notification.type)}</Text></View>
                      {!!badgeText && <Badge text={badgeText} />}
                    </View>

                    <View style={{ flexDirection: 'row' }}>
                      <View
                        style={[
                          styles.cardIcon,
                          { backgroundColor: getNotificationColor(notification.type, !!notification.urgent) },
                        ]}
                      >
                        <IconSymbol name={getNotificationIcon(notification.type) as any} size={18} color="#FFFFFF" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardMessage}>{notification.message}</Text>
                        <Text style={styles.cardTime}>{notification.createdAt?.toLocaleString?.() || ''}</Text>
                      </View>
                    </View>

                    {!notification.read && <View style={styles.unreadCornerDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// No segmented controls anymore

function Badge({ text }: { text: 'Urgent' | 'New' | 'Info' }) {
  const bg = text === 'Urgent' ? '#F04444' : text === 'New' ? colors.primary : colors.textSecondary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
};

const radii = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 22,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },

  // Header (card-like gradient)
  headerCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderRadius: radii.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  headerSubtitle: { color: '#FFE9EF', fontSize: 13, fontWeight: '500', marginTop: 4 },
  unreadBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 88,
  },

  // Unified small type tag
  typeTag: { backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 8, height: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  typeTagText: { color: '#475569', fontWeight: '700', fontSize: 12 },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '800' },
  badge: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  cardMessage: { color: colors.text, fontSize: 13.5, marginTop: 2 },
  cardTime: { marginTop: 10, color: colors.textSecondary, fontSize: 12 },

  // Empty state
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  // Misc
  unreadCornerDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  // devInfo removed: no longer exposing internal API details
});