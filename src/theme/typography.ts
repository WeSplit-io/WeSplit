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
    h1: {
      fontFamily: 'Satoshi',
      fontSize: 35,
      fontStyle: 'normal',
      fontWeight: '700',
      lineHeight: 1.5,
    },
    h2: {
      fontFamily: 'Satoshi',
      fontSize: 22,
      fontStyle: 'normal',
      fontWeight: '700',
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: 'Satoshi',
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: 1.2,
    },
    body: {
      fontFamily: 'Satoshi',
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: '400',
      lineHeight: 1.5,
    },
    bodySmall: {
      fontFamily: 'Satoshi',
      fontSize: 14,
      fontStyle: 'normal',
      fontWeight: '400',
      lineHeight: 1.2,
    },
    button: {
      fontFamily: 'Satoshi',
      fontSize: 18,
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: 1.2,
    },
    navbar: {
      fontFamily: 'Satoshi',
      fontSize: 12,
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: 1.2,
    },


// not used
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
  numberStyles: {
    balance: {
      fontFamily: 'SF Compact',
      fontSize: 35,
      fontStyle: 'normal',
      fontWeight: '556',
      lineHeight: 1.5,
    },
    bigNumber: {
      fontFamily: 'SF Compact',
      fontSize: 30,
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: 1.5,
    },
    bodyNumber: {
      fontFamily: 'SF Compact',
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: 1.2,
    },
  },
}; 