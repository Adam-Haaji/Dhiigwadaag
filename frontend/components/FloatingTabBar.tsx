
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
// Removed BlurView dependency to avoid install/bundling/update issues
import { useTheme } from '@/context/ThemeContext';
import { semanticColors } from '@/constants/colors';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

export interface TabBarItem {
  name: string;
  route: any; // using any to keep router.push flexible across routes/groups
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
  badges?: Record<string, number>; // optional badge counts by tab name
}

export default function FloatingTabBar({
  tabs,
  containerWidth = screenWidth - 40, // Make it wider to fit larger buttons
  borderRadius = 30,
  bottomMargin,
  badges
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const animatedValue = useSharedValue(0);

  // Improved active tab detection with better path matching
  const activeTabIndex = React.useMemo(() => {
    // Find the best matching tab based on the current pathname
    let bestMatch = -1;
    let bestMatchScore = 0;

    tabs.forEach((tab, index) => {
      let score = 0;

      // Exact route match gets highest score
      if (pathname === tab.route) {
        score = 100;
      }
      // Check if pathname starts with tab route (for nested routes)
      else if (pathname.startsWith(tab.route)) {
        score = 80;
      }
      // Check if pathname contains the tab name
      else if (pathname.includes(tab.name)) {
        score = 60;
      }
      // Check for partial matches in the route
      else if (tab.route.includes('/(tabs)/') && pathname.includes(tab.route.split('/(tabs)/')[1])) {
        score = 40;
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });

    // Default to first tab if no match found
    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  React.useEffect(() => {
    if (activeTabIndex >= 0) {
      animatedValue.value = withSpring(activeTabIndex, {
        damping: 20,
        stiffness: 120,
        mass: 1,
      });
    }
  }, [activeTabIndex, animatedValue]);

  const handleTabPress = (route: any) => {
    router.push(route as any);
  };

  const tabWidth = (containerWidth - 20) / tabs.length; // Account for container padding (10px on each side)
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, tabs.length - 1],
            [0, tabWidth * (tabs.length - 1)]
          ),
        },
      ],
    };
  });

  // Dynamic styles based on theme
  const dynamicStyles = {
    blurContainer: {
      ...styles.blurContainer,
      ...Platform.select({
        ios: {
          backgroundColor: isDark ? 'rgba(31,41,55,0.85)' : 'rgba(255,255,255,0.85)',
        },
        android: {
          backgroundColor: isDark ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
          elevation: 8,
        },
        web: {
          backgroundColor: isDark ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
    background: {
      ...styles.background,
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
    },
    indicator: {
      ...styles.indicator,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      width: tabWidth, // numeric width for better typing compatibility
    },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={[
        styles.container,
        {
          width: containerWidth,
          marginBottom: bottomMargin ?? (Platform.OS === 'ios' ? 15 : 25) // Increased bottom margin
        }
      ]}>
        <View
          style={[dynamicStyles.blurContainer, { borderRadius }]}
        >
          <View style={dynamicStyles.background} />
          <Animated.View style={[dynamicStyles.indicator, indicatorStyle]} />
          <View style={styles.tabsContainer}>
            {tabs.map((tab, index) => {
              const isActive = activeTabIndex === index;
              const badgeCount = badges?.[tab.name] ?? 0;

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={styles.tab}
                  onPress={() => handleTabPress(tab.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabContent}>
                    <IconSymbol
                      name={tab.icon as any}
                      size={28} // Increased icon size from 24 to 28
                      color={isActive ? semanticColors.interactivePrimary : semanticColors.textMuted}
                    />
                    {!!badgeCount && (
                      <View style={styles.badgeWrap}>
                        <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: semanticColors.textSecondary },
                        isActive && { color: semanticColors.interactivePrimary, fontWeight: '600' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
  </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center', // Center the content
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
    // width and marginBottom handled dynamically via props
  },
  blurContainer: {
    overflow: 'hidden',
    // borderRadius and other styling applied dynamically
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    // Dynamic styling applied in component
  },
  indicator: {
    position: 'absolute',
    top: 10, // Increased from 8 to 10
    left: 10, // Increased from 8 to 10
    bottom: 10, // Increased from 8 to 10
    borderRadius: 20, // Increased from 17 to 20
    width: `${(100 / 2) - 2}%`, // Default for 2 tabs, will be overridden by dynamic styles
    // Dynamic styling applied in component
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 80, // Increased height from 60 to 80 for larger buttons
    alignItems: 'center',
    paddingHorizontal: 10, // Increased from 8 to 10
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Increased from 8 to 12 for better touch target
    minHeight: 60, // Added minimum height for better touch target
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4, // Increased gap from 2 to 4 for better spacing
  },
  tabLabel: {
    fontSize: 12, // Increased from 11 to 12 for better readability
    fontWeight: '500',
    marginTop: 3, // Increased from 2 to 3
    textAlign: 'center',
    // Dynamic styling applied in component
  },
  badgeWrap: {
    position: 'absolute',
    top: -2,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: semanticColors.interactivePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: semanticColors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
});
