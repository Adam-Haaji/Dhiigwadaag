import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { bannerStyles } from '@/styles/banner';

type HeaderBannerProps = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export default function HeaderBanner({ children, style }: HeaderBannerProps) {
  return <View style={[bannerStyles.container, style as any]}>{children}</View>;
}
