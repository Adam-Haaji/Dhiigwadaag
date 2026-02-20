import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import colorsBase from '@/constants/colors';

type ChatbotButtonProps = {
  onPress: () => void;
};

export default function ChatbotButton({ onPress }: ChatbotButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.button}
      accessibilityLabel="Open chat assistant"
    >
      <View style={styles.iconWrap}>
        <IconSymbol name="drop.fill" size={26} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colorsBase.palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
