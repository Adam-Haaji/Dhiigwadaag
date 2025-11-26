import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';

export default function TabLayout() {
  const { user } = useAuth();
  const role = String(user?.user?.role || '').toLowerCase();

  //  Tabs configuration
  const [activeReqCount, setActiveReqCount] = useState<number>(0);
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

  // ✅ iOS navigation
  if (Platform.OS === 'ios') {
    return (
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
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
