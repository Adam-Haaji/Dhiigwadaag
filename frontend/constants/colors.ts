// Consolidated premium color palette for blood donation app
// Keep legacy keys while introducing expanded semantic tokens.
// Deep professional reds with supportive neutrals and functional colors.
const palette = {
  // Brand / Primary spectrum
  brandDark: '#C62828', // darkest brand red for headings / strong accents
  brand: '#D93434', // main brand red (slightly deeper than legacy)
  brandBright: '#E53935', // brighter red for interactive states / hover
  brandSoft: '#FDE8E8', // subtle tinted background
  // Accent gradient stops
  brandGradFrom: '#C62828',
  brandGradTo: '#E53935',
  // Neutrals
  white: '#FFFFFF',
  gray50: '#F7F8FA',
  gray100: '#F1F2F4',
  gray200: '#E4E6EB',
  gray300: '#D2D5DA',
  gray400: '#B6BBC4',
  gray500: '#9097A2',
  gray600: '#6B7280',
  gray700: '#4B5563',
  gray800: '#323943',
  gray900: '#1F242C',
  // Functional / Status
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
};

// Export legacy default for existing imports expecting { primary, background, text }
export default {
  primary: palette.brandBright, // keep previous behavior while enriching palette
  background: palette.white,
  text: palette.gray900,
  palette,
};

// Named semantic tokens for component-level usage
export const semanticColors = {
  bgSurface: palette.white,
  bgAlt: palette.gray50,
  bgElevated: palette.white,
  borderSubtle: palette.gray200,
  borderStrong: palette.gray300,
  textPrimary: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,
  textInverse: palette.white,
  interactivePrimary: palette.brand,
  interactivePrimaryHover: palette.brandBright,
  interactivePrimaryActive: palette.brandDark,
  interactiveDanger: palette.danger,
  focusRing: palette.brandBright,
  cardShadow: 'rgba(0,0,0,0.06)',
};

// Apply light/dark theme by mutating semantic tokens in-place so components update dynamically
export function applyTheme(isDark: boolean) {
  if (!isDark) {
    // Light theme
    semanticColors.bgSurface = palette.white;
    semanticColors.bgAlt = palette.gray50;
    semanticColors.bgElevated = palette.white;
    semanticColors.borderSubtle = palette.gray200;
    semanticColors.borderStrong = palette.gray300;
    semanticColors.textPrimary = palette.gray900;
    semanticColors.textSecondary = palette.gray600;
    semanticColors.textMuted = palette.gray500;
    semanticColors.textInverse = palette.white;
    semanticColors.interactivePrimary = palette.brand;
    semanticColors.interactivePrimaryHover = palette.brandBright;
    semanticColors.interactivePrimaryActive = palette.brandDark;
    semanticColors.interactiveDanger = palette.danger;
    semanticColors.focusRing = palette.brandBright;
    semanticColors.cardShadow = 'rgba(0,0,0,0.06)';
  } else {
    // Dark theme (aligned with Settings screen palette)
    // Base neutrals
    const BG_DARK = '#0F1115';
    const CARD_DARK = '#1F2937';
    const BORDER_DARK = '#374151';
    const TEXT_DARK = '#F9FAFB';
    const TEXT_MUTED_DARK = '#9CA3AF';
    const TEXT_SECONDARY_DARK = '#9CA3AF';

    semanticColors.bgSurface = CARD_DARK;        // cards and inputs
    semanticColors.bgAlt = BG_DARK;              // screen background
    semanticColors.bgElevated = CARD_DARK;       // elevated surfaces
    semanticColors.borderSubtle = BORDER_DARK;   // subtle borders
    semanticColors.borderStrong = '#4B5563';     // stronger separators
    semanticColors.textPrimary = TEXT_DARK;
    semanticColors.textSecondary = TEXT_SECONDARY_DARK;
    semanticColors.textMuted = TEXT_MUTED_DARK;
    semanticColors.textInverse = palette.white;  // text on primary buttons stays white
    // Keep brand reds for contrast on dark
    semanticColors.interactivePrimary = palette.brand;
    semanticColors.interactivePrimaryHover = palette.brandBright;
    semanticColors.interactivePrimaryActive = palette.brandDark;
    semanticColors.interactiveDanger = palette.danger;
    semanticColors.focusRing = palette.brandBright;
    semanticColors.cardShadow = 'rgba(0,0,0,0.35)';
  }
}

export const gradients = {
  brand: [palette.brandGradFrom, palette.brandGradTo],
  subtleVertical: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)'],
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const elevation = {
  none: {
    shadowColor: 'transparent',
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const typography = {
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0.3 },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '400' },
};

export type TypographyKey = keyof typeof typography;
