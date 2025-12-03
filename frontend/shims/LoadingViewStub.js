// Shim for react-native/Libraries/Utilities/LoadingView to silence Metro warning
import React from 'react';
import { View } from 'react-native';

export default function LoadingView() {
  return null;
}

export const showMessage = () => {};
export const hide = () => {};
