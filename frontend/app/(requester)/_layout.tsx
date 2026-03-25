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

// RequesterTabs: Home, Requests, Notification, Profile only. No Donor tab (initial selection).
export default function RequesterTabLayout() {
  const { user } = useAuth();
  const roleFromAuth = String(user?.user?.role || '').toLowerCase();
  const { isDark } = useTheme();
  const [hasRequesterRecord, setHasRequesterRecord] = React.useState(false);
  const [activeReqCount, setActiveReqCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await api.requesterMe();
        setHasRequesterRecord(!!r?.exists);
      } catch {
        setHasRequesterRecord(false);
      }
    })();
  }, [user?.user?.id]);

  useEffect(() => {
    async function load() {
      try {
        const list: any[] = await api.listRequests();
        const active = list.filter(r => !['fulfilled','completed','cancelled','Fulfilled','Cancelled'].includes(String(r.status).toLowerCase()));
        setActiveReqCount(active.length);
      } catch {}
    }
    load();
  }, [hasRequesterRecord]);

  useEffect(() => {
    let timer: any;
    const loadCounts = async () => {
      try {
        const list: any[] = await api.myNotifications();
        const shaped = list.map((n: any) => ({ type: (n.type || '').toString().toLowerCase(), read: !!n.read }));
        const filtered = shaped.filter(n => ['request','message','system','match'].includes(n.type));
        setUnreadCount(filtered.filter(n => !n.read).length);
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
    if (roleFromAuth === 'donor') {
      router.replace('/(donor)');
      return;
    }
  }, [roleFromAuth]);

  const stableTabs = React.useMemo<TabBarItem[]>(
    () => [
      { name: 'index', route: '/(requester)', icon: 'house.fill', label: 'Home' },
      { name: 'request', route: '/(requester)/request', icon: 'person.2.fill', label: 'Requests' },
      { name: 'notification', route: '/(requester)/notification', icon: 'bell.fill', label: 'Notification' },
      { name: 'profile', route: '/(requester)/profile', icon: 'person.fill', label: 'Profile' },
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
      roleFromProfile="requester"
      hasDonorRecord={false}
      hasRequesterRecord={hasRequesterRecord}
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
            badges={{ notification: unreadCount, request: activeReqCount }}
          />
        </>
      )}
    </RoleModeProvider>
  );
}

function drawableFor(name: string): string | undefined {
  if (name === 'index') return 'ic_home';
  if (name === 'request') return 'ic_request';
  if (name === 'notification') return 'ic_notification';
  if (name === 'profile') return 'ic_profile';
  return undefined;
}
