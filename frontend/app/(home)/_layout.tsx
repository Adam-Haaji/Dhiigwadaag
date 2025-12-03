import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Tabs, Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';

export default function TabLayout() {
  const { user } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();

  //  Tabs configuration
  const [activeReqCount, setActiveReqCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [matchCount, setMatchCount] = useState<number>(0);
  useEffect(() => {
    async function load() {
      if (role === 'requester' || role === 'both' || role === 'admin') {
        try {
          const list: any[] = await api.listRequests();
          const active = list.filter(r => !['fulfilled','completed','cancelled','Fulfilled','Cancelled'].includes(String(r.status).toLowerCase()));
          setActiveReqCount(active.length);
        } catch {}
      }
    }
    load();
  }, [role]);

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
        const roleFiltered = shaped.filter((n: any) => {
          if (role === 'donor') return true;
          if (role === 'requester') return n.type === 'request' || n.type === 'message' || n.type === 'system';
          return true;
        });
        setUnreadCount(roleFiltered.filter(n => !n.read).length);
      } catch {}
      try {
        if (role === 'donor' || role === 'both' || role === 'admin') {
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
  }, [role]);

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
      label: donorStatus === 'unavailable' && unavailableUntil
        ? `Donor (Until ${unavailableUntil.toLocaleDateString()})`
        : 'Donor',
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
    if (role === 'donor') return allTabs.filter(t => ['index','donor','notification','profile'].includes(t.name));
    if (role === 'requester') return allTabs.filter(t => ['index','request','notification','profile'].includes(t.name));
    if (role === 'both' || role === 'admin') return allTabs;
    // role none -> only show Home + Profile
    return allTabs.filter(t => ['index','profile'].includes(t.name));
  }, [role]);

  // ✅ iOS navigation with stable Tabs
  if (Platform.OS === 'ios') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="donor" options={{ title: 'Donor' }} />
        <Tabs.Screen name="request" options={{ title: 'Request' }} />
        <Tabs.Screen name="notification" options={{ title: 'Notification' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    );
  }

  // ✅ Android & Web navigation
  // Return a Stack without children (file-based routing) to avoid "Layout children must be of type Screen" warning,
  // and render the FloatingTabBar as a sibling.
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <FloatingTabBar tabs={tabs} badges={{ notification: unreadCount, donor: matchCount, request: activeReqCount }} />
    </>
  );
}
