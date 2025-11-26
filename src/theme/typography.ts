export const typography = {
  // Font family
  fontFamily: {
    mono: 'monospace',
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    button: 18,
    caption: 12,
    display: 42,
    gigantic: 56,
    hero: 48,
    title: 36,
  },

  // Font weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Text styles
  textStyles: {
    h3: {
      fontSize: 32,
      fontWeight: '600' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    button: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 20,
      letterSpacing: 0.5,
    },
    buttonSmall: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
  },
}; 