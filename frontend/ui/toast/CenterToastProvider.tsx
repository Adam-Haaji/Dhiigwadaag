import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CenterToastView from './CenterToastView';
import type { CenterToastPayload } from './types';
import { registerCenterToastController } from './centerToastController';

const DEFAULT_DURATION_MS = 3400; // Auto-dismiss within the 2.5–4s target window
const IN_MS = 180;
const OUT_MS = 160;
const HEADER_GUARD_PX = 56; // avoids covering typical stack headers

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => setHeight(Math.max(0, e?.endCoordinates?.height || 0));
    const onHide = () => setHeight(0);

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);
  return height;
}

type CenterToastContextValue = {
  show: (payload: CenterToastPayload) => void;
  hide: () => void;
};

const CenterToastContext = createContext<CenterToastContextValue | null>(null);

export function useNotify() {
  const ctx = useContext(CenterToastContext);
  if (!ctx) throw new Error('useNotify must be used within CenterToastProvider');
  return ctx;
}

export default function CenterToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const [toast, setToast] = useState<CenterToastPayload | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const activeToastToken = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: IN_MS, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: IN_MS, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const animateOut = useCallback(() => {
    return new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: OUT_MS, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.98, duration: OUT_MS, useNativeDriver: true }),
      ]).start(({ finished }) => resolve());
    });
  }, [opacity, scale]);

  const hide = useCallback(async () => {
    clearTimer();
    const tokenAtCall = activeToastToken.current;
    if (!toast) return;
    await animateOut();
    if (activeToastToken.current !== tokenAtCall) return;
    setToast(null);
  }, [animateOut, clearTimer, toast]);

  const show = useCallback(
    async (payload: CenterToastPayload) => {
      const nextToken = activeToastToken.current + 1;
      activeToastToken.current = nextToken;
      clearTimer();

      const nextToast: CenterToastPayload = {
        ...payload,
        durationMs: payload.durationMs ?? DEFAULT_DURATION_MS,
      };

      if (toast) {
        await animateOut();
        if (activeToastToken.current !== nextToken) return;
      }

      setToast(nextToast);
      // Wait a tick for layout to mount the toast before animating in
      requestAnimationFrame(() => {
        if (activeToastToken.current !== nextToken) return;
        animateIn();
      });

      hideTimer.current = setTimeout(() => {
        // Only hide if no newer toast has replaced it
        if (activeToastToken.current === nextToken) {
          hide().catch(() => {});
        }
      }, nextToast.durationMs);
    },
    [animateIn, animateOut, clearTimer, hide, toast]
  );

  useEffect(() => {
    registerCenterToastController({ show: (p) => { show(p).catch(() => {}); }, hide: () => { hide().catch(() => {}); } });
    return () => registerCenterToastController(null);
  }, [hide, show]);

  const overlayStyle = useMemo(
    () => [
      styles.overlay,
      {
        top: insets.top + HEADER_GUARD_PX,
        bottom: insets.bottom + keyboardHeight + 12,
        left: 0,
        right: 0,
      },
    ],
    [insets.bottom, insets.top, keyboardHeight]
  );

  const ctxValue = useMemo<CenterToastContextValue>(
    () => ({
      show: (p) => {
        show(p).catch(() => {});
      },
      hide: () => {
        hide().catch(() => {});
      },
    }),
    [hide, show]
  );

  return (
    <CenterToastContext.Provider value={ctxValue}>
      <View style={styles.root} pointerEvents="box-none">
        {children}
        {toast && (
          <View style={overlayStyle} pointerEvents="box-none">
            <View style={styles.centerRow} pointerEvents="box-none">
              <CenterToastView toast={toast} opacity={opacity} scale={scale} onClose={() => { hide().catch(() => {}); }} />
            </View>
          </View>
        )}
      </View>
    </CenterToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  centerRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
