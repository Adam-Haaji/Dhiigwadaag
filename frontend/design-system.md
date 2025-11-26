# Smart Blood App Design & Responsive System

## Purpose
Provide consistent, professional UI across all Android (Samsung, Xiaomi, Tecno, Infinix, Pixel, etc.) and iOS (iPhone 11–16, Mini/Pro/Max) devices without layout shifts while modernizing visuals.

## Core Principles
1. Flex-first layout (avoid explicit widths/heights unless necessary).
2. Scaled typography & spacing via damped proportional scaling (moderateScale) for stability across density/aspect variations.
3. Semantic tokens for color, elevation, radius, spacing: never sprinkle magic numbers in components.
4. Single column max width (layout.maxContentWidth = 680) for large screens & tablets; content centers with fluid padding.
5. Percentage / flex growth for horizontal space; avoid fixed pixel card widths.
6. Always allow verticalScroll content to adapt (ScrollView / FlatList) rather than forcing min-heights.
7. Use responsiveFont() for text sizes to maintain consistent visual weight across DP & pixel ratios.

## Tokens (constants/theme.ts)
| Group | Key | Description |
|-------|-----|-------------|
| Breakpoints | xs/sm/md/lg/xl | Advisory width thresholds for conditional tweaks |
| Spacing | xxs → xxl | Base scale in dp, fed to rs() for dynamic scaling |
| Radii | xs → pill | Consistent rounding (cards 16 / buttons pill) |
| Elevation | none/sm/md/lg | Cross-platform shadow presets |
| Type | h1..caption | Base sizes, post-scaled in typeScale |
| Layout | maxContentWidth | Caps readable line length on large devices |

### Responsive Helpers
```
scale(size)          // linear based on width
verticalScale(size)  // linear based on height
moderateScale(size)  // damped scaling (default factor 0.35)
responsiveFont(size) // moderateScale + PixelRatio rounding
rs(token)            // scaled spacing token
deviceSize.isSmall / isLarge
```

### Usage Patterns
```tsx
import { moderateScale, responsiveFont, rs } from '@/constants/theme';

const styles = StyleSheet.create({
  card: {
    padding: rs('md'),
    borderRadius: rs('lg', false), // keep raw token, no scaling
  },
  title: {
    fontSize: responsiveFont(22),
  },
  icon: { width: moderateScale(24), height: moderateScale(24) }
});
```

## Layout Rules
| Area | Rule |
|------|------|
| Horizontal padding | rs('xl') outer screen padding; nested cards use rs('lg') |
| Vertical rhythm | Block separation multiples of rs('lg'); tight groups rs('sm') |
| Lists | Use flex-basis (e.g., 48%) + gap for grids; never hard-code pixel widths |
| Buttons | minHeight moderateScale(44); pill radius; horizontal padding moderateScale(spacing.lg) |
| Forms | Inputs full width; avoid per-input fixed width; multi-column only above breakpoints.lg |
| Images/Icons | scale() for uniform width-based scaling; keep aspect ratio with resizeMode='contain' |

## Typography
| Element | Size (base) | Responsive | Font weight |
|---------|-------------|-----------|-------------|
| H1 | 28 | responsiveFont(28) | 700 |
| H2 | 22 | responsiveFont(22) | 600 |
| H3 | 18 | responsiveFont(18) | 600 |
| Body | 15 | responsiveFont(15) | 400 |
| Label | 13 | responsiveFont(13) | 500 |
| Caption | 11 | responsiveFont(11) | 400 |

## Color / Elevation
Use semanticColors instead of raw hex. Gradients via `gradients.brand`. Shadows only from elevation presets to keep cross-platform coherence.

## Platform Consistency
| Concern | Strategy |
|---------|----------|
| Font rendering | Inter loaded; fallback system sans; sizes via responsiveFont |
| Shadows | elevation.* + subtle RGBA; avoid custom large blur on Android |
| Status bar | Light content over brand gradient; ensure SafeAreaView top padding |
| Density | moderateScale dampens oversizing on large DPI screens (e.g., Galaxy Ultra) |
| Safe areas | Wrap root screens with SafeAreaView; avoid absolute top spacing constants |

## Component Patterns Updated
Buttons: pill, minHeight 44dp responsive, animated press scale.
Inputs: scaled padding & font, consistent focus ring + subtle shadow.
Cards (Donor / Request): adaptive internal padding + scaled text.
CommonStyles: content maxWidth + scaled typography & spacing.

## Do / Avoid
| ✅ Do | ❌ Avoid |
|------|--------|
| Use rs('md') instead of 16 | Hard-coded 16, 24, etc |
| Use flex + gap (where supported) | Absolute pixel widths for columns |
| responsiveFont for titles | Fixed large numbers causing overflow on small phones |
| minHeight on touch targets | Very small tappable areas < 40dp |
| Gradients brand/semantic colors | Random red hexes across files |

## Extending
Add conditional style tweaks: `deviceSize.isSmall` to reduce horizontal padding; `isLarge` to increase card radius or grid columns.

## Accessibility & Scaling
All sizes based on scaling functions remain legible when system font scaling is moderate. For extreme accessibility sizes, consider integrating `react-native-size-matters` or platform-specific accessibility adjustments.

## Next Steps (Optional)
1. Migrate remaining screens to tokens (search for numeric literals > 4 not part of opacity).
2. Introduce dark mode palette mapping semanticColors to dark equivalents.
3. Add motion tokens (duration: fast=120ms, medium=200ms, slow=300ms) for consistent animations.
4. Implement skeleton loaders (cards) using gradient shimmer.
5. Provide automated visual regression with Detox + screenshot diff.

---
This document accompanies the updated token & component code. Follow these rules for any new screen to ensure flawless cross-device consistency.
## Design System Overview

This document lists the upgraded UI tokens and component patterns applied to modernize the Blood Donation & Emergency Matching app UI while preserving all functional flows.

### Visual Principles
1. Trust & Clarity – Neutral surfaces, high contrast text, restrained accent reds.
2. Soft Depth – Light shadows (blur + low opacity) with generous radius (12–20px).
3. Focus & Urgency – Brand red reserved for primary CTAs & emergency indicators.
4. Accessible Typography – Clear hierarchy, 4 weights (400–700), legible sizes.
5. Micro-interactions – Subtle scale on press, soft focus ring, gradient motion.

### Color Palette (semantic)
| Token | Value | Usage |
|-------|-------|-------|
| brandDark | #C62828 | Active/pressed, headings accent |
| brand | #D93434 | Primary default |
| brandBright | #E53935 | Hover/highlight |
| brandSoft | #FDE8E8 | Tinted backgrounds |
| gray50 | #F7F8FA | App background alt |
| gray100 | #F1F2F4 | Divider / subtle surfaces |
| gray200 | #E4E6EB | Borders |
| gray300 | #D2D5DA | Strong borders |
| gray400 | #B6BBC4 | Icons inactive |
| gray500 | #9097A2 | Muted text |
| gray600 | #6B7280 | Secondary text |
| gray700 | #4B5563 | Strong secondary headings |
| gray800 | #323943 | Body text dark mode bridge |
| gray900 | #1F242C | Primary text |
| success | #16A34A | Success states |
| warning | #F59E0B | Warning states |
| danger | #DC2626 | High urgency |
| info | #2563EB | Informational accent |

### Gradients
brand: linear 135deg from brandDark → brandBright.
subtleVertical: transparent → white (soft overlay).

### Spacing Scale
xxs 4, xs 8, sm 12, md 16, lg 20, xl 28, xxl 36.
Consistent vertical rhythm: sections use multiples of md (16) or lg (20).

### Radii
xs 4, sm 8, md 12, lg 16, xl 20, pill 999.
Cards use lg (16). Buttons pill. Inputs md (12).

### Elevation
sm: y2 blur4 opacity6%
md: y4 blur8 opacity8%
lg: y8 blur14 opacity10%
Prefer elevation sm for cards in a scroll; md for modals.

### Typography
| Style | Size | Line | Weight |
|-------|------|------|--------|
| h1 | 28 | 34 | 700 |
| h2 | 22 | 28 | 600 |
| h3 | 18 | 24 | 600 |
| body | 15 | 22 | 400 |
| label | 13 | 18 | 500 |
| caption | 11 | 14 | 400 |

### Component Guidelines
Buttons: Pill shape, gradient fill for primary/danger, scale micro-interaction, 15px font with letter-spacing 0.3.
Inputs: Soft border (#E4E6EB), focus ring with subtle shadow + brand border, helper/error text below.
Cards (DonorCard, RequestCard): Elevated surface, lg radius, internal spacing md. Badge for blood type.
Urgency Indicator: Dot color mapped to urgency semantic.

### Accessibility
Minimum contrast ratio 4.5:1 for body text on background. Brand on white meets contrast guidelines for interactive elements.

### Motion Tokens (Implicit)
Press scale: 1 → 0.97 (spring), release 0.97 → 1.
Focus transition: 120ms ease for border/shadow.

### Future Enhancements (Not Implemented Yet)
1. Skeleton loaders with shimmer for network states.
2. Lottie-based subtle success/alert animations.
3. Dark mode palette (extend existing dark tokens in `theme.ts`).
4. Theming context + dynamic high-contrast mode toggle.
5. Shared motion utilities for entrance transitions.

---
All tokens are exported via `constants/colors.ts` for immediate component adoption.