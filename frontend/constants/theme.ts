/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// App theme additions (requested): colors, spacing, radii
export const colors = {
  primary: '#E31B54',
  primaryDark: '#C40F45',
  bg: '#F6F7FB',
  card: '#FFFFFF',
  border: '#E7E7EA',
  text: '#1F2937',
  textMuted: '#6B7280',
  success: '#16A34A',
  info: '#2563EB',
  danger: '#DC2626',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

// Responsive design additions --------------------------------------------------
// Base guideline sizes (iPhone X reference) – used for scale calculations.
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Breakpoints (width in dp). These are advisory; we keep layout fluid via flex.
export const breakpoints = {
  xs: 0,      // very small devices
  sm: 360,    // small phones (older Android)
  md: 400,    // mainstream phones
  lg: 480,    // large phones / small tablets
  xl: 600,    // tablets / foldables portrait
} as const;

// Responsive scaling helpers (no dependency on hooks so can be imported anywhere)
import { Dimensions, PixelRatio } from 'react-native';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
export const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
export const moderateScale = (size: number, factor = 0.35) => {
  const scaled = scale(size);
  return size + (scaled - size) * factor; // damped scaling for better consistency
};
export const responsiveFont = (size: number) => {
  // Use moderate scale then round to nearest pixel for crisp rendering
  return PixelRatio.roundToNearestPixel(moderateScale(size));
};

// Container width limits for large screens (keep central column consistent)
export const layout = {
  maxContentWidth: 680,
  gutter: spacing.md,
};

// Adaptive typography mapping (device-aware sizes)
export const typeScale = {
  h1: { fontSize: responsiveFont(28), lineHeight: responsiveFont(34) },
  h2: { fontSize: responsiveFont(22), lineHeight: responsiveFont(28) },
  h3: { fontSize: responsiveFont(18), lineHeight: responsiveFont(24) },
  body: { fontSize: responsiveFont(15), lineHeight: responsiveFont(22) },
  label: { fontSize: responsiveFont(13), lineHeight: responsiveFont(18) },
  caption: { fontSize: responsiveFont(11), lineHeight: responsiveFont(14) },
};

// Utility to pick spacing token by semantic size with optional scale
export const rs = (token: keyof typeof spacing, autoScale: boolean = true) => {
  const base = spacing[token];
  return autoScale ? Math.round(moderateScale(base)) : base;
};

// Convenience boolean flags
export const deviceSize = {
  isSmall: SCREEN_WIDTH < breakpoints.md,
  isLarge: SCREEN_WIDTH >= breakpoints.lg,
};

