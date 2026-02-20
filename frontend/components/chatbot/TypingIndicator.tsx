import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { semanticColors } from '@/constants/colors';

export default function TypingIndicator() {
  const a = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const anims = [0, 1, 2].map((i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a[i], { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(a[i], { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((anim) => anim.start());
    return () => anims.forEach((anim) => anim.stop());
  }, []);

  const opacity = (i: number) =>
    a[i].interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

  return (
    <View style={styles.wrapper}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>B</Text>
      </View>
      <View style={styles.bubble}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: opacity(i) }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D93434',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    color: semanticColors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: semanticColors.bgAlt,
    borderWidth: 1,
    borderColor: semanticColors.borderSubtle,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semanticColors.textMuted,
  },
});
