
import React from 'react';
import { router } from 'expo-router';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const OnboardingScreen2 = () => {
  return (
    <View style={styles.container}>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Illustration */}
      <Image
        source={require('../assets/image/onboarding2.png')} // change image name/path if needed
        style={styles.image}
        resizeMode="contain"
      />

      {/* Title */}
      <Text style={styles.title}>Save Lifes</Text>

      {/* Description */}
      <Text style={styles.description}>
        sed quia non numquam eius modi tempora labore
        et dolore magnam aliquam.
      </Text>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
      </View>

      {/* Next Button */}
      <TouchableOpacity onPress={() => router.push('/onboarding3')} accessibilityRole="button"  style={styles.nextButton}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OnboardingScreen2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: 'black',
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
    color: 'black',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
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
    backgroundColor: '#F2B6B6',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#FF6B6B',
  },
  nextButton: {
    backgroundColor: '#FF5A5F',
    width: '85%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});