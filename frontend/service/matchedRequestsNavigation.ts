import { router } from 'expo-router';
import { getNavigatorRole, type NavigatorRole } from '@/service/homeMode';

type RoleLike = string | null | undefined;

function normalizeRole(role: RoleLike): NavigatorRole | null {
  const v = String(role || '').toLowerCase();
  if (v === 'donor') return 'donor';
  if (v === 'requester') return 'requester';
  if (v === 'both') return 'both';
  return null;
}

function notificationPathFor(role: NavigatorRole | null): '/(donor)/notification' | '/(requester)/notification' | '/(home)/notification' {
  if (role === 'donor') return '/(donor)/notification';
  if (role === 'requester') return '/(requester)/notification';
  return '/(home)/notification';
}

/**
 * Single source of truth for "View Matched Requests" routing.
 * Always lands on the Notification tab in the correct navigator group.
 */
export async function goToMatchedRequests(roleHint?: RoleLike) {
  const persistedRole = await getNavigatorRole();
  const role = persistedRole ?? normalizeRole(roleHint);
  const pathname = notificationPathFor(role);

  router.push({
    pathname,
    params: { openLatestRequest: '1' },
  });
}
