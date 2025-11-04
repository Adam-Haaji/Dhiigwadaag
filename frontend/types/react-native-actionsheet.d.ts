declare module 'react-native-actionsheet' {
  import * as React from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface ActionSheetProps {
    title?: string;
    options: string[];
    cancelButtonIndex?: number;
    destructiveButtonIndex?: number;
    onPress?: (index: number) => void;
    tintColor?: string;
    styles?: {
      titleBox?: ViewStyle;
      titleText?: TextStyle;
      buttonBox?: ViewStyle;
      buttonText?: TextStyle;
      cancelButtonBox?: ViewStyle;
    };
  }

  export default class ActionSheet extends React.Component<ActionSheetProps> {
    show: () => void;
    hide: () => void;
  }
}
