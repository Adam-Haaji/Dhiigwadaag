import React, { useEffect, useState, useMemo } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import useAuth from '@/hooks/useAuth';
import api from '@/service/api';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';
import { useOptionalRoleMode } from '@/context/RoleModeContext';

type Noti = {
  id: string;
  _id?: string;
  type: 'donor'|'request'|'match'|'system'|'emergency';
  title: string;
  message: string;
  body?: string;
  timestamp: string;
  createdAt?: string;
  data?: any;
  requestId?: string;
  donorId?: string;
  matchId?: string;
  metaType?: string;
  audience?: 'requester' | 'donor';
  recipientUserId?: string;
  meta?: {
    requestName?: string;
    requestBloodType?: string;
    donorName?: string;
    donorPhone?: string;
    donorBloodGroup?: string;
    donorDistrict?: string;
    [k: string]: any;
  };
};

function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Noti[]>([]);
  const { isDark } = useTheme();
  const roleMode = useOptionalRoleMode();
  const [loadError, setLoadError] = useState<string | null>(null);
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: semanticColors.bgAlt },
    list: { padding: 16 },
    card: { backgroundColor: semanticColors.bgSurface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: semanticColors.borderSubtle, marginBottom: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: semanticColors.textPrimary, fontWeight: '800' },
    msg: { color: semanticColors.textSecondary, marginTop: 6 },
    time: { color: semanticColors.textSecondary, marginTop: 6, fontSize: 12 },
    roleTag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
    tagTxt: { color: semanticColors.textInverse, fontWeight: '700' },
    tagDonor: { backgroundColor: semanticColors.interactivePrimary },
    tagReq: { backgroundColor: semanticColors.interactiveDanger },
    tagMatch: { backgroundColor: semanticColors.interactivePrimaryActive },
  }), [isDark]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadError(null);
        const res = await api.myNotifications();
        const list: any[] = Array.isArray(res?.notifications) ? res.notifications as any[] : (Array.isArray(res) ? (res as any[]) : []);
        const normalized: Noti[] = list.map((n: any) => {
          const requestId = n.requestId || n.meta?.requestId || n.data?.requestId || n.data?.meta?.requestId || n.request?._id || n.request?.id || (typeof n.request === 'string' ? n.request : undefined) || undefined;
          const donorId = n.donorId || n.meta?.donorId || n.data?.donorId || n.data?.meta?.donorId || n.donor?._id || n.donor?.id || n.donor || undefined;
          const matchId = n.matchId || n.meta?.matchId || n.data?.matchId || requestId;
          const metaType = n.meta?.type || n.data?.type || undefined;
          const audience = (n.meta?.audience || n.data?.audience) as 'requester' | 'donor' | undefined;
          const type = (n.type || (n.category ?? '') || '').toString().toLowerCase();
          const meta = n.meta || n.data?.meta || {};
          return {
            id: n.id || n._id || String(Math.random()),
            type: (type === 'donor' || type === 'request' || type === 'match' || type === 'system' || type === 'emergency')
              ? (type as Noti['type'])
              : 'system',
            title: n.title || 'Notification',
            message: n.body || n.message || '',
            timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
            data: n.data || { requestId, donorId, matchId, type: metaType, audience },
            requestId,
            donorId,
            matchId,
            metaType,
            audience,
            recipientUserId: n.userId ? String(n.userId) : undefined,
            meta: {
              requestName: meta.requestName,
              requestBloodType: meta.requestBloodType,
              donorName: meta.donorName,
              donorPhone: meta.donorPhone,
              donorBloodGroup: meta.donorBloodGroup,
              donorDistrict: meta.donorDistrict,
              ...meta,
            },
          } as Noti;
        });
        const role = user?.user?.role?.toLowerCase();
        const viewerMode = roleMode?.activeMode || (role === 'donor' ? 'donor' : 'requester');

        // Strict requester notifications: only these 3 events.
        const allowedRequesterMetaTypes = new Set(['MATCHED', 'DONOR_ACCEPTED', 'FULFILLED']);
        const filtered = viewerMode === 'requester'
          ? normalized.filter((n) => n.audience === 'requester' && !!n.metaType && allowedRequesterMetaTypes.has(String(n.metaType)))
          : normalized.filter((n) => n.audience !== 'requester');
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (alive) setItems(filtered);
      } catch (e: any) {
        if (alive) {
          setLoadError(e?.message || 'Failed to load notifications');
          setItems([]);
        }
      }
    })();
    return () => { alive = false; };
  }, [user, roleMode?.activeMode]);

  const openDetails = async (n: Noti) => {
    const role = user?.user?.role?.toLowerCase();
    const viewerMode = roleMode?.activeMode || (role === 'donor' ? 'donor' : 'requester');
    const audience = n.audience ?? (n.data as any)?.audience;
    if (__DEV__) {
      console.log('viewerRole', role, 'notifType', n.type, 'recipient', n.recipientUserId);
    }
    const title = String(n.title || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    const isDonorMatched = (title.includes('donor matched') || title.includes('you are matched') || msg.includes('matched to donate') || msg.includes('you are matched'));
    const isDonorAccepted = (title.includes('donor accepted') || msg.includes('donor has accepted'));
    const looksDonorTarget = title.includes('you are matched') || msg.includes('matched to donate') || msg.includes('you are matched');
    const isMatchType = (n.type || '').toString().toLowerCase() === 'match';
    const isMatchedEvent = n.metaType === 'MATCHED' || (n.data as any)?.type === 'MATCHED';
    const rawId = n.requestId ?? n.matchId ?? (n.data as any)?.requestId ?? (n.data as any)?.matchId;
    const requestId = rawId != null ? String(rawId) : null;
    const donorIdRaw = n.donorId ?? (n.data as any)?.donorId;
    const donorIdParam = donorIdRaw != null ? String(donorIdRaw) : undefined;
    const matchIdRaw = n.matchId ?? (n.data as any)?.matchId;
    const matchIdParam = matchIdRaw != null ? String(matchIdRaw) : undefined;
    const isRequestFulfilled = n.metaType === 'FULFILLED' || n.metaType === 'REQUEST_FULFILLED' || ((n.data as any)?.type === 'FULFILLED') || ((n.data as any)?.type === 'REQUEST_FULFILLED') || ((n.data as any)?.meta?.type === 'FULFILLED') || ((n.data as any)?.meta?.type === 'REQUEST_FULFILLED');
    const looksRequestFulfilledTitle = title === 'request fulfilled' || title === 'donation fulfilled';

    // Safety guard: requester mode must never reach donor accept/decline UX.
    if (viewerMode === 'requester' && audience !== 'requester') {
      router.push({ pathname: '/notification-message', params: { payload: JSON.stringify({ title: n.title, message: n.message }) } });
      return;
    }

    // Requester notifications: show ONLY MATCHED / DONOR_ACCEPTED / FULFILLED.
    if (audience === 'requester') {
      if (isRequestFulfilled && (requestId || donorIdParam || matchIdParam)) {
        router.push({
          pathname: '/match-details',
          params: {
            payload: JSON.stringify({
              type: 'FULFILLED',
              title: n.title,
              message: n.message,
              requestId: requestId || undefined,
              donorId: donorIdParam,
              matchId: matchIdParam,
            }),
          },
        });
        return;
      }
      if (n.metaType === 'MATCHED' || n.metaType === 'DONOR_ACCEPTED' || isRequestFulfilled) {
        if (requestId) {
          router.push({ pathname: '/requestStatus', params: { id: requestId } });
          return;
        }
        router.push({ pathname: '/notification-message', params: { payload: JSON.stringify({ title: n.title, message: n.message }) } });
        return;
      }
      router.push({ pathname: '/notification-message', params: { payload: JSON.stringify({ title: n.title, message: n.message }) } });
      return;
    }

    // Donor notifications (audience === 'donor' or legacy): open matched request detail (Accept/Decline).
    // Requester must never reach this branch for their own notifications due to filter above.
    if (isRequestFulfilled) {
      if (requestId || donorIdParam || matchIdParam) {
        router.push({
          pathname: '/match-details',
          params: {
            payload: JSON.stringify({
              type: 'REQUEST_FULFILLED',
              title: n.title,
              message: n.message,
              requestId: requestId || undefined,
              donorId: donorIdParam,
              matchId: matchIdParam,
            }),
          },
        });
        return;
      }
      Alert.alert('Details unavailable', 'Donor details not available yet. Please check again.');
      if (__DEV__) console.warn('[Notifications] REQUEST_FULFILLED missing donorId/matchId/requestId', n);
      return;
    }

    // Backward compatibility for old stored notifications:
    // If title looks like a fulfilled notification but meta.type is missing, verify the request belongs to me,
    // then treat it as REQUEST_FULFILLED.
    if (!isRequestFulfilled && looksRequestFulfilledTitle && requestId) {
      try {
        const req: any = await api.getRequest(String(requestId));
        const requesterId = (typeof req?.requesterId === 'object' ? (req?.requesterId?._id || req?.requesterId?.id) : req?.requesterId) || null;
        const me = user?.user?.id;
        if (requesterId && me && String(requesterId) === String(me)) {
          router.push({
            pathname: '/match-details',
            params: {
              payload: JSON.stringify({
                type: 'REQUEST_FULFILLED',
                title: n.title,
                message: n.message,
                requestId: String(requestId),
              }),
            },
          });
          return;
        }
      } catch {}
    }

    // Donor: "You are matched" (or match category or meta.type=MATCHED) → same screen as "View Matched Requests" (Accept & Donate / Decline).
    // Do NOT depend on user.role (role may remain 'user' under collection separation).
    if ((looksDonorTarget || isMatchType || isMatchedEvent) && !isRequestFulfilled) {
      if (requestId) {
        router.push({ pathname: '/matchedRequestDetail', params: { id: requestId, mode: 'donor' } });
        return;
      }
      Alert.alert('Match details not found', 'This notification has no link to the request. Open Matched Requests from the dashboard.');
      if (__DEV__) console.warn('[Notifications] You are matched notification missing requestId/matchId', n);
      return;
    }

    // "Donor Matched" / "Donor Accepted" (requester): message only.
    if (isDonorMatched || isDonorAccepted) {
      router.push({ pathname: '/notification-message', params: { payload: JSON.stringify({ title: n.title, message: n.message }) } });
      return;
    }

    // All other: message-only view.
    router.push({ pathname: '/notification-message', params: { payload: JSON.stringify({ title: n.title, message: n.message }) } });
  };

  const renderItem = ({ item }: { item: Noti }) => {
    const isRequesterView = item.audience === 'requester';
    const mt = item.metaType;
    let displayTitle = item.title;
    let displayMessage = item.message;
    let subtitle: string | null = null;
    let donorDetails: string | null = null;

    if (isRequesterView && mt) {
      if (mt === 'MATCHED') {
        displayTitle = 'Donor found';
        displayMessage = 'Donor found';
        const rn = item.meta?.requestName ?? '';
        const bt = item.meta?.requestBloodType ?? '';
        subtitle = [rn, bt].filter(Boolean).join(' • ') || null;
      } else if (mt === 'DONOR_ACCEPTED') {
        displayTitle = 'Donor accepted your request';
        displayMessage = 'Donor accepted your request';
      } else if (mt === 'FULFILLED' || mt === 'REQUEST_FULFILLED') {
        displayTitle = 'Request fulfilled';
        displayMessage = 'Request fulfilled';
        const parts = [
          item.meta?.donorName,
          item.meta?.donorPhone,
          item.meta?.donorBloodGroup,
          item.meta?.donorDistrict,
        ].filter(Boolean) as string[];
        donorDetails = parts.length ? parts.join(' • ') : null;
      }
    }

    return (
      <TouchableOpacity style={s.card} onPress={() => { void openDetails(item); }}>
        <View style={s.rowBetween}>
          <Text style={s.title}>{displayTitle}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isRequesterView && mt ? (
              <View style={[s.roleTag, s.tagMatch]}>
                <Text style={s.tagTxt}>
                  {mt === 'FULFILLED' || mt === 'REQUEST_FULFILLED' ? 'Fulfilled' : mt === 'DONOR_ACCEPTED' ? 'Accepted' : mt === 'MATCHED' ? 'Matched' : mt}
                </Text>
              </View>
            ) : null}
            <View style={[s.roleTag, item.type === 'donor' ? s.tagDonor : item.type === 'request' ? s.tagReq : s.tagMatch]}>
              <Text style={s.tagTxt}>{item.type === 'donor' ? 'Donor' : item.type === 'request' ? 'Request' : 'Match'}</Text>
            </View>
          </View>
        </View>
        <Text style={s.msg}>{displayMessage}</Text>
        {subtitle ? <Text style={[s.msg, { marginTop: 2 }]}>{subtitle}</Text> : null}
        {donorDetails ? <Text style={[s.msg, { marginTop: 2 }]}>{donorDetails}</Text> : null}
        <Text style={s.time}>{new Date(item.timestamp).toLocaleString()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {loadError ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ color: semanticColors.interactiveDanger, fontWeight: '700' }}>{loadError}</Text>
        </View>
      ) : null}
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={s.list} />
    </SafeAreaView>
  );
}

export default NotificationsScreen;
export { NotificationsScreen };
