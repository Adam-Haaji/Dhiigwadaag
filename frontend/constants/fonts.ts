// Font family mapping. Inter will be loaded via @expo-google-fonts/inter.
// Fallback to system if not yet loaded.
export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const fontConfig = {
  heading: fontFamilies.bold,
  subheading: fontFamilies.semibold,
  body: fontFamilies.regular,
  label: fontFamilies.medium,
};

export default fontFamilies;
