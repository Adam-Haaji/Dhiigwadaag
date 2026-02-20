import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { user } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();
  const { isDark } = useTheme();
  const [hasRequesterRecord, setHasRequesterRecord] = React.useState(false);
  const [hasDonorRecord, setHasDonorRecord] = React.useState(false);

  //  Tabs configuration
  const [activeReqCount, setActiveReqCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [matchCount, setMatchCount] = useState<number>(0);
  
  // Check for requester and donor records (for role separation)
  React.useEffect(() => {
    async function checkRecords() {
      try {
        const requesterData = await api.requesterMe();
        setHasRequesterRecord(!!requesterData?.exists);
      } catch {
        setHasRequesterRecord(false);
      }
      // For donor, check via API call (like requester) to properly detect donor records
      try {
        const donorData = await api.donorMe();
        setHasDonorRecord(!!donorData?.exists);
      } catch {
        // Fallback to legacy check if API fails
        const donorStatus = String(user?.user?.donorStatus || '').toLowerCase();
        setHasDonorRecord(
          (donorStatus !== 'not_a_donor' && donorStatus !== '') ||
          role === 'donor' || 
          role === 'both'
        );
      }
    }
    checkRecords();
  }, [role, user?.user?.donorStatus, user?.user?.id]);
  
  useEffect(() => {
    async function load() {
      // Check if user is requester (by record or role)
      const isRequester = hasRequesterRecord || role === 'requester' || role === 'both' || role === 'admin';
      if (isRequester) {
        try {
          const list: any[] = await api.listRequests();
          const active = list.filter(r => !['fulfilled','completed','cancelled','Fulfilled','Cancelled'].includes(String(r.status).toLowerCase()));
          setActiveReqCount(active.length);
        } catch {}
      }
    }
    load();
  }, [role, hasRequesterRecord]);

  // Poll for unread notifications and donor matches
  useEffect(() => {
    let timer: any;
    const loadCounts = async () => {
      try {
        const list: any[] = await api.myNotifications();
        const shaped = list.map((n: any) => ({
          type: (n.type || '').toString().toLowerCase(),
          read: !!n.read,
        }));
        // Filter based on actual records, not just role
        const isDonor = hasDonorRecord || role === 'donor' || role === 'both' || role === 'admin';
        const isRequester = hasRequesterRecord || role === 'requester' || role === 'both' || role === 'admin';
        const roleFiltered = shaped.filter((n: any) => {
          if (isDonor) return true; // Donors see all notifications
          if (isRequester) return n.type === 'request' || n.type === 'message' || n.type === 'system' || n.type === 'match';
          return true;
        });
        setUnreadCount(roleFiltered.filter(n => !n.read).length);
      } catch {}
      try {
        if (hasDonorRecord || role === 'donor' || role === 'both' || role === 'admin') {
          const matches: any[] = await api.listMyMatches();
          setMatchCount(Array.isArray(matches) ? matches.length : 0);
        } else {
          setMatchCount(0);
        }
      } catch {}
    };
    (async () => {
      await loadCounts();
      timer = setInterval(loadCounts, 5000);
    })();
    return () => { if (timer) clearInterval(timer); };
  }, [role, hasRequesterRecord, hasDonorRecord]);

  const unavailableUntil = user?.user?.unavailableUntil ? new Date(user.user.unavailableUntil) : null;
  const donorStatus = String(user?.user?.donorStatus || 'not_a_donor');

  let allTabs: TabBarItem[] = [
    {
      name: 'index',
      route: '/(home)', // Use this for the home screen (points to index.tsx automatically)
      icon: 'house.fill',
      label: 'Home',
    },
    {
      name: 'donor',
      route: '/(home)/donor',
      icon: 'heart.fill',
      label: 'Donor',
    },
    {
      name: 'request',
      route: '/(home)/request',
      icon: 'person.2.fill',
      label: (role === 'requester' || role === 'both' || role === 'admin')
        ? (activeReqCount > 0 ? `Requests (${activeReqCount})` : 'Requests')
        : 'Request',
    },
    {
      name: 'notification',
      route: '/(home)/notification',
      icon: 'bell.fill',
      label: 'Notification',
    },
    {
      name: 'profile',
      route: '/(home)/profile',
      icon: 'person.fill',
      label: 'Profile',
    },
  ];

  const tabs: TabBarItem[] = React.useMemo(() => {
    // Check actual records, not just role field (for role separation)
    const isDonor = hasDonorRecord || role === 'donor' || role === 'both' || role === 'admin';
    const isRequester = hasRequesterRecord || role === 'requester' || role === 'both' || role === 'admin';
    
    if (isDonor && !isRequester) return allTabs.filter(t => ['index','donor','notification','profile'].includes(t.name));
    if (isRequester && !isDonor) return allTabs.filter(t => ['index','request','notification','profile'].includes(t.name));
    if (isDonor && isRequester) return allTabs; // both
    if (role === 'admin') return allTabs;
    // role none -> only show Home + Profile
    return allTabs.filter(t => ['index','profile'].includes(t.name));
  }, [role, hasRequesterRecord, hasDonorRecord]);

  // ✅ iOS navigation
  if (Platform.OS === 'ios') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NativeTabs>
        <NativeTabs.Trigger name="index"> {/* opens app/(home)/index.tsx */}
          <Icon sf="house.fill" drawable="ic_home" />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="donor">
          <Icon sf="heart.fill" drawable="ic_donor" />
          <Label>Donor</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="request">
          <Icon sf="person.2.fill" drawable="ic_request" />
          <Label>Request</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="notification">
          <Icon sf="bell.fill" drawable="ic_notification" />
          <Label>Notification</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf="person.fill" drawable="ic_profile" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
        </NativeTabs>
      </>
    );
  }

  // ✅ Android & Web navigation
  // Return a Stack without children (file-based routing) to avoid "Layout children must be of type Screen" warning,
  // and render the FloatingTabBar as a sibling.
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          // Add bottom padding so content doesn't hide behind sticky tab bar
          contentStyle: { paddingBottom: 72 },
        }}
      />
      <FloatingTabBar tabs={tabs} badges={{ notification: unreadCount, donor: matchCount, request: activeReqCount }} />
    </>
  );
}
