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
import { getNavigatorRole, setNavigatorRole } from '@/service/homeMode';

// BothTabs: only for role === "both". Donor/requester-only users must use (donor)/(requester) so Requests tab is hidden.
export default function TabLayout() {
  const { user } = useAuth();
  const roleFromAuth = String(user?.user?.role || '').toLowerCase();
  const lastStableRoleRef = React.useRef(roleFromAuth);
  if (roleFromAuth) lastStableRoleRef.current = roleFromAuth;
  const authRole = roleFromAuth || lastStableRoleRef.current;
  const [persistedRole, setPersistedRole] = React.useState<string | null>(null);
  const { isDark } = useTheme();

  // Persisted "navigator role": so returning donor-only users always see DonorTabs (no Requests tab).
  React.useEffect(() => {
    let cancelled = false;
    getNavigatorRole().then((r) => {
      if (!cancelled && r) setPersistedRole(r);
    });
    return () => { cancelled = true; };
  }, [user?.user?.id]);

  const role = persistedRole || authRole;

  // Gate: (home) = BothTabs only when role is "both". Donor/requester -> dedicated tabs; user/none -> Choose Your Path.
  useEffect(() => {
    if (role === 'donor') {
      router.replace('/(donor)');
      return;
    }
    if (role === 'requester') {
      router.replace('/(requester)');
      return;
    }
    if (role === 'user' || role === 'none' || !role?.trim()) {
      router.replace('/role');
      return;
    }
  }, [role]);

  const [hasRequesterRecord, setHasRequesterRecord] = React.useState(false);
  const [hasDonorRecord, setHasDonorRecord] = React.useState(false);

  // Old users: infer navigator role from records so donor-only users never see Requests tab.
  React.useEffect(() => {
    if (persistedRole !== null || !user?.user?.id) return;
    if (hasDonorRecord && !hasRequesterRecord) {
      setNavigatorRole('donor').then(() => setPersistedRole('donor'));
    } else if (!hasDonorRecord && hasRequesterRecord) {
      setNavigatorRole('requester').then(() => setPersistedRole('requester'));
    } else if (hasDonorRecord && hasRequesterRecord) {
      setNavigatorRole('both').then(() => setPersistedRole('both'));
    }
  }, [persistedRole, hasDonorRecord, hasRequesterRecord, user?.user?.id]);

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

  const baseTabs = React.useMemo(() => {
    const requestLabel = activeReqCount > 0 ? `Requests (${activeReqCount})` : 'Requests';
    const indexTab: TabBarItem = { name: 'index', route: '/(home)', icon: 'house.fill', label: 'Home' };
    const donorTab: TabBarItem = { name: 'donor', route: '/(home)/donor', icon: 'heart.fill', label: 'Donor' };
    const requestTab: TabBarItem = { name: 'request', route: '/(home)/request', icon: 'person.2.fill', label: requestLabel };
    const notificationTab: TabBarItem = { name: 'notification', route: '/(home)/notification', icon: 'bell.fill', label: 'Notification' };
    const profileTab: TabBarItem = { name: 'profile', route: '/(home)/profile', icon: 'person.fill', label: 'Profile' };
    return { indexTab, donorTab, requestTab, notificationTab, profileTab };
  }, [activeReqCount]);

  // IMPORTANT (navigation stability): keep a stable tab list so role/mode changes do NOT
  // change the set/order of tabs. Per-screen guards (already present) handle access.
  const stableTabs = React.useMemo(
    () => [baseTabs.indexTab, baseTabs.donorTab, baseTabs.requestTab, baseTabs.notificationTab, baseTabs.profileTab],
    [baseTabs]
  );

  // Stable screenOptions so Stack identity and behavior never force remounts.
  const stackScreenOptions = React.useMemo(
    () => ({
      headerShown: false,
      animation: 'none' as const,
      contentStyle: { paddingBottom: 72 },
      unmountOnBlur: false,
    }),
    []
  );

  // Do not render BothTabs when role is donor/requester (redirect will send to (donor)/(requester)).
  if (role === 'donor' || role === 'requester') {
    return null;
  }
  // User/none: redirect to Choose Your Path (never show 5 tabs for initial selection).
  if (role === 'user' || role === 'none' || !role?.trim()) {
    return null;
  }
  // While we have no persisted role and auth says "both", wait for record check so we don't flash 5 tabs for donor-only users.
  if (persistedRole === null && authRole === 'both') {
    return null;
  }

  return (
    <RoleModeProvider
      roleFromProfile={role}
      hasDonorRecord={hasDonorRecord}
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
            badges={{ notification: unreadCount, donor: matchCount, request: activeReqCount }}
          />
        </>
      )}
    </RoleModeProvider>
  );
}

function drawableFor(name: string): string | undefined {
  if (name === 'index') return 'ic_home';
  if (name === 'donor') return 'ic_donor';
  if (name === 'request') return 'ic_request';
  if (name === 'notification') return 'ic_notification';
  if (name === 'profile') return 'ic_profile';
  return undefined;
}
