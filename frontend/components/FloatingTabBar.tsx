
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
import { ui } from '@/styles/ui';
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
  containerWidth = screenWidth, // full width for flat minimal bar
  borderRadius = 12,
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

  const tabWidth = containerWidth / tabs.length;
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
    bar: {
      ...styles.bar,
      ...ui.tabBar.container,
    },
    indicator: {
      ...styles.indicator,
      width: tabWidth,
      backgroundColor: 'transparent', // make indicator invisible for minimal look
    },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={[styles.container, { width: containerWidth, marginBottom: bottomMargin ?? 0 }] }>
        <View style={dynamicStyles.bar}>
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
                      size={24}
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
                        isActive ? styles.tabLabelActive : styles.tabLabelInactive,
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
    alignItems: 'stretch',
  },
  container: {
    alignSelf: 'stretch',
  },
  bar: {
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    height: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: semanticColors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: semanticColors.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 56,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: semanticColors.interactivePrimary,
    fontWeight: '600',
  },
  tabLabelInactive: {
    color: semanticColors.textSecondary,
    fontWeight: '500',
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
