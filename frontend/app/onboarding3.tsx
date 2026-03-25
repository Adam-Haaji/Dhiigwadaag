import React, { useMemo } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import colorsBase, { semanticColors } from '@/constants/colors';

const onboarding3 = () => {
  const { isDark } = useTheme();

  const styles = useMemo(() => {
    const dotIdle = isDark ? semanticColors.borderStrong : colorsBase.palette.brandSoft;
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: semanticColors.bgAlt,
        paddingHorizontal: 24,
        paddingTop: 40,
        justifyContent: 'center',
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
      imageContainer: {
        alignItems: 'center',
        marginBottom: 40,
      },
      image: {
        width: 200,
        height: 200,
        borderRadius: 10,
      },
      header: {
        marginBottom: 30,
      },
      title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: semanticColors.textPrimary,
        textAlign: 'center',
        letterSpacing: 0.5,
      },
      descriptionContainer: {
        marginBottom: 30,
      },
      description: {
        fontSize: 16,
        color: semanticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        letterSpacing: 0.3,
      },
      dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
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
      divider: {
        height: 1,
        backgroundColor: semanticColors.borderSubtle,
        marginVertical: 30,
        width: '100%',
      },
      buttonContainer: {
        alignItems: 'center',
        marginTop: 20,
      },
      button: {
        backgroundColor: semanticColors.interactivePrimary,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 8,
        minWidth: 200,
        alignItems: 'center',
      },
      buttonText: {
        color: semanticColors.textInverse,
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
      },
    });
  }, [isDark]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Skip Button */}
      <TouchableOpacity onPress={() => router.push('/login')} accessibilityRole="button" style={styles.skipButton}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('../assets/image/onboarding3.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Header/Title Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Get Matched Fast</Text>
      </View>

      {/* Description Section */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>
          We match donors and requests to make the process faster and easier.
        </Text>
      </View>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
      </View>

      

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() =>router.push('/login')} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
export default onboarding3;
