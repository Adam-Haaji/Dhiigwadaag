import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';
import colorsBase, { semanticColors } from '@/constants/colors';

const onboarding1 = () => {
  const { isDark } = useTheme();

  const styles = useMemo(() => {
    const dotIdle = isDark ? semanticColors.borderStrong : colorsBase.palette.brandSoft;
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: semanticColors.bgAlt,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
      },
      skipButton: {
        position: 'absolute',
        top: 40,
        right: 20,
      },
      skipText: {
        fontSize: 16,
        color: semanticColors.textPrimary,
      },
      image: {
        width: '80%',
        height: 250,
        marginBottom: 30,
      },
      title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: semanticColors.textPrimary,
      },
      description: {
        fontSize: 14,
        textAlign: 'center',
        color: semanticColors.textSecondary,
        marginBottom: 30,
        width: '85%',
      },
      dotsContainer: {
        flexDirection: 'row',
        marginBottom: 40,
      },
      dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: dotIdle,
        marginHorizontal: 5,
      },
      activeDot: {
        backgroundColor: semanticColors.interactivePrimary,
      },
      nextButton: {
        backgroundColor: semanticColors.interactivePrimary,
        width: '85%',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
      },
      nextText: {
        color: semanticColors.textInverse,
        fontSize: 16,
        fontWeight: 'bold',
      },
    });
  }, [isDark]);

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Skip Button */}
      <TouchableOpacity onPress={() =>router.push('/login')} accessibilityRole="button" style={styles.skipButton}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Illustration */}
      <Image
        source={require('../assets/image/onboarding1.png')} // corrected extension to match assets
        style={styles.image}
        resizeMode="contain"
      />

      {/* Title */}
      <Text style={styles.title}>Donate Blood</Text>
 
      {/* Description */}
      <Text style={styles.description}>
        Donate blood and help save lives in your community.
      </Text>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Next Button */}
      <TouchableOpacity onPress={() =>router.push('/onboarding2')} accessibilityRole="button" style={styles.nextButton}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default onboarding1;
