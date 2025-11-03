
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import api, { getBaseUrl } from "../../service/api";
import { useFocusEffect } from '@react-navigation/native';

export default function NotificationScreen() {
  const [activeTab, setActiveTab] = useState<'all'|'unread'|'request'|'message'|'urgent'|'normal'|'critical'>('all');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null); setLoading(true);
    try {
      const list = await api.myNotifications();
      setNotifications(list.map((n: any) => ({
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
      })));
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
      return () => { if (timer) clearInterval(timer); };
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

  const filteredNotifications = notifications.filter(notification => {
    // All = all request notifications
    if (activeTab === 'all') return notification.type === 'request';
    // Unread = only unread request notifications
    if (activeTab === 'unread') return notification.type === 'request' && !notification.read;
    if (activeTab === 'normal') return notification.type === 'request' && String(notification.urgency).toLowerCase() === 'normal';
    if (activeTab === 'urgent') return notification.type === 'request' && String(notification.urgency).toLowerCase() === 'urgent';
    if (activeTab === 'critical') return notification.type === 'request' && String(notification.urgency).toLowerCase() === 'critical';
    return notification.type === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Notifications",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
      )}
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {([
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'normal', label: 'Normal' },
            { key: 'urgent', label: 'Urgent' },
            { key: 'critical', label: 'Critical' },
            { key: 'request', label: 'Requests' },
            { key: 'message', label: 'Messages' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dev: show current API base URL to help iOS device setup */}
        {__DEV__ && (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>API: {getBaseUrl()}</Text>
          </View>
        )}

        {/* Notifications List */}
        <ScrollView 
          style={styles.notificationsList}
          contentContainerStyle={[
            styles.notificationsContent,
            Platform.OS !== 'ios' && styles.notificationsContentWithTabBar
          ]}
          showsVerticalScrollIndicator={false}
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="bell.slash" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No notifications found</Text>
              <Text style={styles.emptyStateSubtext}>
                {activeTab === 'unread' 
                  ? "You're all caught up!" 
                  : "Check back later for updates"}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadNotification
                ]}
                onPress={async () => {
                  try {
                    await api.markOneRead(notification.id);
                  } catch {}
                  if (notification.type === 'request' && notification.requestId) {
                    // Route to the correct detail screen based on the notification source
                    const target = (notification as any)?.source || (notification as any)?.meta?.source;
                    if (target === 'blood-request') {
                      router.push({ pathname: '/requestStatus', params: { id: String(notification.requestId) } });
                    } else {
                      router.push({ pathname: '/requestDetail', params: { id: String(notification.requestId) } });
                    }
                  }
                }}
              >
                <View style={styles.notificationContent}>
                  <View style={[
                    styles.notificationIcon,
                    { backgroundColor: getNotificationColor(notification.type, notification.urgent) }
                  ]}>
                    <IconSymbol 
                      name={getNotificationIcon(notification.type) as any} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </View>
                  
                  <View style={styles.notificationText}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      {notification.urgent && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentBadgeText}>!</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>{notification.time}</Text>
                  </View>
                  
                  {!notification.read && (
                    <View style={styles.unreadCornerDot} />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Action Buttons */}
          {/* {filteredNotifications.length > 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={async () => { await api.markAllRead(); load(); }}>
              <IconSymbol name="checkmark.circle" size={20} color={colors.success} />
              <Text style={styles.actionButtonText}>Mark All Read</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={load}>
              <IconSymbol name="arrow.clockwise" size={20} color={colors.text} />
              <Text style={styles.actionButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )} */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 20,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    paddingHorizontal: 20,
  },
  notificationsContentWithTabBar: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  urgentBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  unreadCornerDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 8,
  },
});
