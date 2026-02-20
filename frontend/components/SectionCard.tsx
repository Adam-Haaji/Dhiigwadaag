import React from 'react';
import { View, ViewStyle } from 'react-native';
import { commonStyles } from '@/styles/commonStyles';
import { semanticColors } from '@/constants/colors';

type SectionCardProps = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export default function SectionCard({ children, style }: SectionCardProps) {
  return (
    <View style={[commonStyles.card, { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle }, style as any]}>
      {children}
    </View>
  );
}
