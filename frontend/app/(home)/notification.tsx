import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import api, { getBaseUrl } from '../../service/api';
import { useFocusEffect } from '@react-navigation/native';

// Lazy-load LinearGradient to avoid type resolution issues in some setups
let LinearGradient: any;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  LinearGradient = View;
}

type ScopeTab = 'donors' | 'requests';
type RequestFilter = 'all' | 'unread' | 'normal' | 'urgent' | 'critical';

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
  const [scope, setScope] = useState<ScopeTab>('requests');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await api.myNotifications();
      setNotifications(
        list.map((n: any) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          time: new Date(n.createdAt).toLocaleString(),
          read: n.read,
          urgent: !!n.urgent,
          source: n?.meta?.source,
          requestId: n?.meta?.requestId,
          requesterName: n?.meta?.requesterName,
          requesterBloodType: n?.meta?.requesterBloodType,
          requesterPhone: n?.meta?.requesterPhone,
          urgency: n?.meta?.urgency,
        }))
      );
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
        timer = setInterval(load, 15000);
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

  const scoped = useMemo(() => {
    if (scope === 'requests') {
      return notifications.filter((n) => n.type === 'request');
    }
    // donors scope: anything that is not a request (donation, message, system...)
    return notifications.filter((n) => n.type !== 'request');
  }, [notifications, scope]);

  const filtered = useMemo(() => {
    if (scope !== 'requests') return scoped;

    // requests filters
    return scoped.filter((n) => {
      const urgency = String(n.urgency || '').toLowerCase();
      if (requestFilter === 'all') return true;
      if (requestFilter === 'unread') return !n.read;
      if (requestFilter === 'normal') return urgency === 'normal';
      if (requestFilter === 'urgent') return urgency === 'urgent';
      if (requestFilter === 'critical') return urgency === 'critical';
      return true;
    });
  }, [scoped, scope, requestFilter]);

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
          {/* Segmented scope tabs (Donors/Requests) */}
          <View style={styles.segmentWrap}>
            <Segment label="Donors" active={scope === 'donors'} onPress={() => setScope('donors')} left />
            <Segment label="Requests" active={scope === 'requests'} onPress={() => setScope('requests')} />
          </View>

          {/* Request sub-filters (only when scope === 'requests') */}
          {scope === 'requests' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subTabsContent}
              style={styles.subTabs}
            >
              {(['all', 'unread', 'normal', 'urgent', 'critical'] as RequestFilter[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setRequestFilter(key)}
                  activeOpacity={0.9}
                  style={[styles.subTab, requestFilter === key && styles.subTabActive]}
                >
                  <Text style={[styles.subTabText, requestFilter === key && styles.subTabTextActive]}>
                    {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Dev helper - API base URL */}
          {__DEV__ && (
            <Text style={styles.devInfo}>API: {getBaseUrl()}</Text>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="bell.slash" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No notifications found</Text>
              <Text style={styles.emptyStateSubtext}>
                {scope === 'requests' && requestFilter === 'unread' ? "You're all caught up!" : 'Check back later for updates'}
              </Text>
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
                        if (target === 'blood-request') {
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
                        <Text style={styles.cardTime}>{notification.time}</Text>
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

function Segment({
  active,
  label,
  onPress,
  left,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  left?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.segment, active && styles.segmentActive, left ? { marginRight: 8 } : null]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

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

  // Scope segments
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F7',
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.text,
  },

  // Sub tabs (request filters)
  subTabs: {
    maxHeight: 48,
    marginBottom: spacing.lg,
  },
  subTabsContent: {
    paddingHorizontal: 2,
  },
  subTab: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary,
  },
  subTabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  subTabTextActive: { color: colors.primary },

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
  devInfo: { color: colors.textSecondary, fontSize: 12, marginBottom: 12 },
});