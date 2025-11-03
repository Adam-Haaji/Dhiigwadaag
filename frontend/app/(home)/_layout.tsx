import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {

  //  Tabs configuration
  const tabs: TabBarItem[] = [
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
      label: 'Request',
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
