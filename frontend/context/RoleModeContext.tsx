import React from 'react';
import { getHomeModePreference, setHomeModePreference } from '@/service/homeMode';

export type Role = 'requester' | 'donor' | 'both';
export type ActiveMode = 'requester' | 'donor';

type Capabilities = {
  hasDonorRecord: boolean;
  hasRequesterRecord: boolean;
};

type RoleModeState = {
  role: Role;
  activeMode: ActiveMode;
  setActiveMode: (mode: ActiveMode) => Promise<void>;
  capabilities: Capabilities;
  markHasDonorRecord: () => void;
  markHasRequesterRecord: () => void;
};

type Props = {
  roleFromProfile: string;
  hasDonorRecord: boolean;
  hasRequesterRecord: boolean;
  children: React.ReactNode;
};

const RoleModeContext = React.createContext<RoleModeState | null>(null);

function normalizeRoleFromProfile(roleFromProfile: string): Role | null {
  const r = String(roleFromProfile || '').toLowerCase();
  if (r === 'donor') return 'donor';
  if (r === 'requester') return 'requester';
  if (r === 'both') return 'both';
  return null;
}

function deriveRole({ roleFromProfile, hasDonorRecord, hasRequesterRecord }: Omit<Props, 'children'>): Role {
  if (hasDonorRecord && hasRequesterRecord) return 'both';
  if (hasDonorRecord) return 'donor';
  if (hasRequesterRecord) return 'requester';
  return normalizeRoleFromProfile(roleFromProfile) ?? 'requester';
}

const DEFAULT_BOTH_MODE: ActiveMode = 'requester';

export function RoleModeProvider(props: Props) {
  const { children } = props;

  // Local capability state so we can update instantly (without waiting for parent effects).
  const [capabilities, setCapabilities] = React.useState<Capabilities>({
    hasDonorRecord: !!props.hasDonorRecord,
    hasRequesterRecord: !!props.hasRequesterRecord,
  });

  // Keep local capability state in sync with parent checks.
  React.useEffect(() => {
    setCapabilities({
      hasDonorRecord: !!props.hasDonorRecord,
      hasRequesterRecord: !!props.hasRequesterRecord,
    });
  }, [props.hasDonorRecord, props.hasRequesterRecord]);

  const role = React.useMemo(
    () =>
      deriveRole({
        roleFromProfile: props.roleFromProfile,
        hasDonorRecord: capabilities.hasDonorRecord,
        hasRequesterRecord: capabilities.hasRequesterRecord,
      }),
    [props.roleFromProfile, capabilities.hasDonorRecord, capabilities.hasRequesterRecord]
  );
  const [activeMode, setActiveModeState] = React.useState<ActiveMode>(DEFAULT_BOTH_MODE);

  // Initialize activeMode from persisted preference once per role (single setState per role value; no reset loops).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const pref = await getHomeModePreference();
      if (cancelled) return;

      if (role === 'donor') {
        setActiveModeState('donor');
        return;
      }
      if (role === 'requester') {
        setActiveModeState('requester');
        return;
      }
      if (pref === 'donor' || pref === 'requester') {
        setActiveModeState(pref);
      } else {
        setActiveModeState(DEFAULT_BOTH_MODE);
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [role]);

  // Safety guard: if activeMode ever becomes invalid, reset.
  React.useEffect(() => {
    if (activeMode !== 'donor' && activeMode !== 'requester') {
      setActiveModeState(DEFAULT_BOTH_MODE);
    }
    // Only enforce this guard; do not persist here (avoids loops).
  }, [activeMode]);

  const setActiveMode = React.useCallback(async (mode: ActiveMode) => {
    const next: ActiveMode = mode === 'donor' ? 'donor' : 'requester';
    setActiveModeState(next);
    try {
      await setHomeModePreference(next);
    } catch {}
  }, []);

  const markHasDonorRecord = React.useCallback(() => {
    setCapabilities((c) => (c.hasDonorRecord ? c : { ...c, hasDonorRecord: true }));
  }, []);

  const markHasRequesterRecord = React.useCallback(() => {
    setCapabilities((c) => (c.hasRequesterRecord ? c : { ...c, hasRequesterRecord: true }));
  }, []);

  const value = React.useMemo<RoleModeState>(
    () => ({
      role,
      activeMode,
      setActiveMode,
      capabilities,
      markHasDonorRecord,
      markHasRequesterRecord,
    }),
    [role, activeMode, setActiveMode, capabilities, markHasDonorRecord, markHasRequesterRecord]
  );

  return <RoleModeContext.Provider value={value}>{children}</RoleModeContext.Provider>;
}

export function useRoleMode(): RoleModeState {
  const ctx = React.useContext(RoleModeContext);
  if (!ctx) throw new Error('useRoleMode must be used within RoleModeProvider');
  return ctx;
}

export function useOptionalRoleMode(): RoleModeState | null {
  return React.useContext(RoleModeContext);
}
