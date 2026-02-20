import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, Animated, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colorsExport, { semanticColors, gradients, radii, spacing, elevation } from '../constants/colors';
import { moderateScale, responsiveFont } from '../constants/theme';
import { fontFamilies } from '../constants/fonts';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  iconLeft,
  iconRight,
  fullWidth = true,
  accessibilityLabel,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  const content = (
    <View style={[styles.contentRow, fullWidth && { justifyContent: 'center' }]}>        
      {iconLeft && <View style={styles.icon}>{iconLeft}</View>}
      <Text
        style={[
          styles.text,
          isGhost && { color: semanticColors.interactivePrimary },
          isSecondary && { color: semanticColors.textPrimary },
          isDanger && { color: semanticColors.textInverse },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {loading && <ActivityIndicator style={{ marginLeft: moderateScale(6) }} size="small" color={semanticColors.textInverse} />}
      {iconRight && <View style={[styles.icon, { marginLeft: moderateScale(6) }]}>{iconRight}</View>}
    </View>
  );

  const baseStyle = [
    styles.base,
    fullWidth && { alignSelf: 'stretch' },
    disabled && { opacity: 0.5 },
    (isPrimary || isDanger) && styles.primaryBase,
    isSecondary && styles.secondary,
    isGhost && styles.ghost,
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => {
          const pressedStyle = pressed && !isGhost ? { opacity: 0.9 } : null;
          return [baseStyle, pressedStyle] as any; // Cast to relax RN style typing for conditional array entries
        }}
      >
        {isPrimary || isDanger ? (
          <LinearGradient
            colors={isDanger ? [colorsExport.palette.danger, colorsExport.palette.brandDark] : gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {content}
          </LinearGradient>
        ) : (
          content
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: moderateScale(spacing.sm),
    paddingHorizontal: moderateScale(spacing.lg),
    minHeight: moderateScale(44),
    overflow: 'hidden',
    backgroundColor: semanticColors.bgSurface,
    ...elevation.none,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  primaryBase: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingVertical: moderateScale(spacing.sm),
    paddingHorizontal: moderateScale(spacing.lg),
    minHeight: moderateScale(44),
  },
  secondary: {
    backgroundColor: semanticColors.bgAlt,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  
  text: {
    color: semanticColors.textInverse,
    fontFamily: fontFamilies.semibold,
    fontSize: responsiveFont(15),
    letterSpacing: 0.3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: moderateScale(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
