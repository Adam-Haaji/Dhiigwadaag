declare module 'expo-symbols' {
  import * as React from 'react';
  import { StyleProp, ViewStyle, ImageResizeMode } from 'react-native';

  // Matches common SF Symbols weights; kept permissive for SDK variations
  export type SymbolWeight =
    | 'ultraLight'
    | 'thin'
    | 'light'
    | 'regular'
    | 'medium'
    | 'semibold'
    | 'bold'
    | 'heavy'
    | 'black';

  export interface SymbolViewProps {
    name: string;
    tintColor?: string;
    weight?: SymbolWeight;
    // Resize mode string union varies across RN versions; allow RN type or string
    resizeMode?: ImageResizeMode | string;
    style?: StyleProp<ViewStyle>;
  }

  export const SymbolView: React.ComponentType<SymbolViewProps>;
}
