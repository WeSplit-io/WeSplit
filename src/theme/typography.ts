export const typography = {
  // === FONT FAMILIES ===
  // System fonts for React Native
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
    thin: 'System',
    // Add custom fonts here when available
    // primary: 'YourCustomFont-Regular',
    // primaryBold: 'YourCustomFont-Bold',
  },
  
  // === ✅✅✅ FONT SIZES === ================================================================
  // Comprehensive scale matching Figma designs
  fontSize: {
    // Base scale (following 1.25 ratio)
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,

     // Component specific
     button: 18,
     buttonSmall: 16,
     buttonLarge: 20,

     
    
    // Semantic sizes
    tiny: 10,
    small: 13,
    base: 16,
    large: 18,
    xlarge: 20,
    
    // Display sizes
    heading: 32,
    title: 36,
    display: 42,
    hero: 48,
    gigantic: 56,
    
   
    input: 16,
    label: 14,
    caption: 12,
    overline: 10,
    
    // Navigation
    tabBar: 12,
    navTitle: 18,
    
    // Specific to mockups
    balanceAmount: 48, // Large balance display
    groupName: 20,
    userName: 28,
    welcomeText: 18,
    cardTitle: 16,
    listItem: 16,
    sectionHeader: 14,
  },
  
  // === ✅✅✅ FONT WEIGHTS === ================================================================
  fontWeight: {
    thin: '100' as const,
    extralight: '200' as const,
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
    
    // Semantic weights
    regular: '400' as const,
    strong: '600' as const,
    heavy: '700' as const,
  },
  
  // === LINE HEIGHTS ===
  // Calculated as fontSize * lineHeight ratio
  lineHeight: {
    none: 1,
    tight: 1.1,
    snug: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
    
    // Specific line heights
    xs: 16,  // fontSize.xs * 1.33
    sm: 20,  // fontSize.sm * 1.43
    md: 24,  // fontSize.md * 1.5
    lg: 28,  // fontSize.lg * 1.56
    xl: 32,  // fontSize.xl * 1.6
    xxl: 36, // fontSize.xxl * 1.5
    xxxl: 40, // fontSize.xxxl * 1.43
  },
  
  // === LETTER SPACING ===
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
    
    // Component specific
    button: 0.5,
    heading: -1,
    display: -2,
    overline: 1.5,
  },
  
  // === PREDEFINED TEXT STYLES ===
  // Complete text styles matching Figma components
  textStyles: {
    // === HEADINGS ===
    h1: {
      fontSize: 48,
      fontWeight: '700' as const,
      lineHeight: 56,
      letterSpacing: -2,
    },
    h2: {
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
      letterSpacing: -1,
    },
    h3: {
      fontSize: 32,
      fontWeight: '600' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h4: {
      fontSize: 28,
      fontWeight: '600' as const,
      lineHeight: 36,
      letterSpacing: -0.25,
    },
    h5: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      letterSpacing: 0,
    },
    h6: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: 0,
    },
    
    // === BODY TEXT ===
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 28,
      letterSpacing: 0,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: 0,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
    overline: {
      fontSize: 10,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
    },
    
    // === BUTTONS ===
    buttonLarge: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0.5,
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
    
    // === LABELS AND FORMS ===
    labelLarge: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0,
    },
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 18,
      letterSpacing: 0,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
    
    // === SPECIFIC COMPONENT STYLES ===
    // Dashboard balance display
    balanceAmount: {
      fontSize: 48,
      fontWeight: '800' as const,
      lineHeight: 52,
      letterSpacing: -2,
    },
    
    // User name display
    userName: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.5,
    },
    
    // Welcome text
    welcomeText: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    
    // Group names and titles
    groupName: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    
    // Card titles
    cardTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      letterSpacing: 0,
    },
    
    // List items
    listItemTitle: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0,
    },
    listItemSubtitle: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 18,
      letterSpacing: 0,
    },
    
    // Section headers
    sectionHeader: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 18,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    
    // Navigation
    tabBarLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
    
    navTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    
    // Amount displays
    amountLarge: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 28,
      letterSpacing: -0.25,
    },
    amountMedium: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    amountSmall: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 18,
      letterSpacing: 0,
    },
    
    // Status and metadata text
    statusText: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
    
    // Error and helper text
    errorText: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 18,
      letterSpacing: 0,
    },
    helperText: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
    
    // Logo text
    logoText: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 28,
      letterSpacing: -0.5,
    },
    
    // QR code labels
    qrLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 18,
      letterSpacing: 0,
    },
  },
}; 