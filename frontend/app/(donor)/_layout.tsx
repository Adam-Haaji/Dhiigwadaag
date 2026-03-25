import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Stack, router } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { RoleModeProvider } from '@/context/RoleModeContext';

// DonorTabs: Home, Donor, Notification, Profile only. No Request tab (initial selection).
export default function DonorTabLayout() {
  const { user } = useAuth();
  const roleFromAuth = String(user?.user?.role || '').toLowerCase();
  const { isDark } = useTheme();
  const [hasDonorRecord, setHasDonorRecord] = React.useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [matchCount, setMatchCount] = useState<number>(0);

  React.useEffect(() => {
    (async () => {
      try {
        const d = await api.donorMe();
        setHasDonorRecord(!!d?.exists);
      } catch {
        setHasDonorRecord(false);
      }
    })();
  }, [user?.user?.id]);

  useEffect(() => {
    let timer: any;
    const loadCounts = async () => {
      try {
        const list: any[] = await api.myNotifications();
        const shaped = list.map((n: any) => ({ type: (n.type || '').toString().toLowerCase(), read: !!n.read }));
        setUnreadCount(shaped.filter(n => !n.read).length);
      } catch {}
      try {
        const matches: any[] = await api.listMyMatches();
        setMatchCount(Array.isArray(matches) ? matches.length : 0);
      } catch {}
    };
    (async () => { await loadCounts(); timer = setInterval(loadCounts, 5000); })();
    return () => { if (timer) clearInterval(timer); };
  }, []);

  // When user upgrades to "both" (dashboard switch), show BothTabs.
  useEffect(() => {
    if (roleFromAuth === 'both') {
      router.replace('/(home)');
      return;
    }
    if (roleFromAuth === 'requester') {
      router.replace('/(requester)');
      return;
    }
  }, [roleFromAuth]);

  const stableTabs = React.useMemo<TabBarItem[]>(
    () => [
      { name: 'index', route: '/(donor)', icon: 'house.fill', label: 'Home' },
      { name: 'donor', route: '/(donor)/donor', icon: 'heart.fill', label: 'Donor' },
      { name: 'notification', route: '/(donor)/notification', icon: 'bell.fill', label: 'Notification' },
      { name: 'profile', route: '/(donor)/profile', icon: 'person.fill', label: 'Profile' },
    ],
    []
  );

  const stackScreenOptions = React.useMemo(
    () => ({
      headerShown: false,
      animation: 'none' as const,
      contentStyle: { paddingBottom: 72 },
      unmountOnBlur: false,
    }),
    []
  );

  return (
    <RoleModeProvider
      roleFromProfile="donor"
      hasDonorRecord={hasDonorRecord}
      hasRequesterRecord={false}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {Platform.OS === 'ios' ? (
        <NativeTabs>
          {stableTabs.map((t) => (
            <NativeTabs.Trigger key={t.name} name={t.name as any}>
              <Icon sf={t.icon as any} drawable={drawableFor(t.name) as any} />
              <Label>{t.label}</Label>
            </NativeTabs.Trigger>
          ))}
        </NativeTabs>
      ) : (
        <>
          <Stack screenOptions={stackScreenOptions} />
          <FloatingTabBar
            tabs={stableTabs}
            badges={{ notification: unreadCount, donor: matchCount }}
          />
        </>
      )}
    </RoleModeProvider>
  );
}

function drawableFor(name: string): string | undefined {
  if (name === 'index') return 'ic_home';
  if (name === 'donor') return 'ic_donor';
  if (name === 'notification') return 'ic_notification';
  if (name === 'profile') return 'ic_profile';
  return undefined;
}
