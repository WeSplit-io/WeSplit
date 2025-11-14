import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp, Dimensions } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { HouseLine, PiggyBank, ArrowsSplit, Medal, Users } from 'phosphor-react-native';
import { colors, spacing, typography } from '../../theme';
import platformUtils from '../../utils/core/platformUtils';
import { logger } from '../../services/core';

const styles = StyleSheet.create({

  container: {
    paddingBottom: spacing.sm,
    borderRadius: 20,
    backgroundColor: '#121D1F',
    borderWidth: 0.5,
    borderColor: colors.white50,
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 20,
    height: platformUtils.navBar.height,
    zIndex: 9999,
    elevation: 9999,
    width: undefined,
    top: undefined,
    ...platformUtils.shadows.large,
  },

  scrollContent: {
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    flexDirection: 'row',
    flex: 1,
    paddingTop: platformUtils.navBar.contentPaddingTop,
    paddingBottom: spacing.sm,
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    position: 'relative',
  },

  navLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: platformUtils.navBar.labelMarginTop,
    textAlign: 'center',
    fontFamily: platformUtils.typography.fontFamily,
    fontWeight: '500' as const,
    letterSpacing: platformUtils.typography.letterSpacing.small,
    lineHeight: platformUtils.typography.lineHeight.navLabel,
  },
  navLabelActive: {
    marginTop: platformUtils.navBar.labelMarginTop,
    color: colors.green,
    fontWeight: '600' as const,
  },

  topIndicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    width: 40,
    borderBottomRightRadius: 2,
    borderBottomLeftRadius: 2,
  },

  specialNavItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    marginBottom: 0,
  },
  specialButton: {
    width: platformUtils.navBar.specialButtonSize,
    height: platformUtils.navBar.specialButtonSize,
    borderRadius: platformUtils.navBar.specialButtonSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  specialButtonImage: {
    width: platformUtils.iconSizes.specialButtonIcon,
    height: platformUtils.iconSizes.specialButtonIcon,
    tintColor: colors.black,
    resizeMode: 'contain' as const,
  },
  navIcon: {
    width: platformUtils.iconSizes.navIcon,
    height: platformUtils.iconSizes.navIcon,
    resizeMode: 'contain' as const,
  },

  scrollContentCompact: {
    paddingHorizontal: spacing.xs,
  },
  navItemCompact: {
    minWidth: 50,
    paddingHorizontal: spacing.xs,
  },
  specialButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

const navItems = [
  { icon: 'house', label: 'Home', route: 'Dashboard', IconComponent: HouseLine },
  { icon: 'piggy', label: 'Pools', route: 'SplitsList', IconComponent: PiggyBank },
  { icon: 'split', label: 'Split', route: 'BillCamera', isSpecial: true, IconComponent: ArrowsSplit },
  { icon: 'crownSimple', label: 'Rewards', route: 'Rewards', IconComponent: Medal },
  { icon: 'users', label: 'Contacts', route: 'Contacts', IconComponent: Users },
];

interface NavBarProps {
  navigation: NavigationContainerRef<Record<string, object | undefined>> | { navigate: (route: string) => void };
  currentRoute?: string;
  customStyle?: StyleProp<ViewStyle>;
}

const NavBar: React.FC<NavBarProps> = ({ navigation, currentRoute, customStyle }) => {
  const { width: screenWidth } = Dimensions.get('window');
  
  const containerPadding = 32;
  const scrollContentPadding = 16;
  const availableWidth = screenWidth - containerPadding - scrollContentPadding;
  const itemWidth = availableWidth / navItems.length;
  
  const isCompactMode = itemWidth < 60;
  const handleNavigation = (route: string) => {
    if (!route) {
      console.warn('NavBar: No route provided for navigation');
      return;
    }
    
    if (!navigation) {
      console.warn('NavBar: Navigation object not available');
      return;
    }

    try {
      logger.info('Navigating to route', { route: String(route) }, 'NavBar');
      
      if (route === 'Contacts') {
        navigation.navigate('Contacts' as never, {} as never);
      } else if (route === 'SplitsList') {
        navigation.navigate('SplitsList' as never, {} as never);
      } else if (route === 'BillCamera') {
        // Navigate to camera screen for OCR-based split creation
        navigation.navigate('BillCamera' as never, {} as never);
      } else {
        navigation.navigate(route as never);
      }
    } catch (error) {
      logger.error(`NavBar: Error navigating to ${String(route)}`, { error: error as Record<string, unknown> }, 'NavBar');
    }
  };

  const isActiveRoute = (route: string) => {
    if (currentRoute === route) {
      return true;
    }
    
    if (route === 'Contacts' && currentRoute === 'Contacts') {
      return true;
    }
    if (route === 'SplitsList' && currentRoute === 'SplitsList') {
      return true;
    }
    if (route === 'SplitsList' && currentRoute === 'SplitDetails') {
      return true;
    }
    if (route === 'BillCamera' && (currentRoute === 'BillCamera' || currentRoute === 'BillProcessing')) {
      return true;
    }
    
    return false;
  };

  interface NavItem {
    icon: string;
    label: string;
    route: string;
    isSpecial?: boolean;
    IconComponent: React.ComponentType<{ 
      size?: number; 
      color?: string; 
      weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
      style?: ViewStyle;
    }>;
  }

  const renderPhosphorIcon = (item: NavItem, isActive: boolean) => {
    const { IconComponent, icon } = item;
    const iconSize = isCompactMode ? 20 : 24;
    
    let iconColor;
    if (icon === 'split') {
      iconColor = colors.black;
    } else {
      iconColor = isActive ? colors.green : colors.white70;
    }
    
    const rotationStyle: ViewStyle = icon === 'split' ? { transform: [{ rotate: '180deg' }] } : {};
    
    return (
      <IconComponent
        size={iconSize}
        color={iconColor}
        weight={isActive ? 'fill' : 'regular'}
        style={rotationStyle}
      />
    );
  };

  return (
    <View style={[styles.container, customStyle]}>
      <View style={[styles.scrollContent, isCompactMode && styles.scrollContentCompact]}>
        {navItems.map((item, index) => {
          const isActive = isActiveRoute(item.route);
          
          return (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.navItem, 
                item.isSpecial && styles.specialNavItem,
                isCompactMode && styles.navItemCompact
              ]} 
              onPress={() => handleNavigation(item.route)}
              activeOpacity={platformUtils.touchFeedback.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel={`Navigate to ${item.label}`}
              accessibilityState={{ selected: isActive }}
              accessibilityHint={`Opens the ${item.label} screen`}
            >
              {item.isSpecial ? (
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  style={[styles.specialButton, isCompactMode && styles.specialButtonCompact]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {renderPhosphorIcon(item, true)}
                </LinearGradient>
              ) : (
                renderPhosphorIcon(item, isActive)
              )}
              {!item.isSpecial && isActive && (
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.topIndicator}
                />
              )}
              {!isCompactMode && (
                isActive ? (
                  <Text style={[styles.navLabelActive]}>
                        {item.label}
                      </Text>
                 
                ) : (
                  <Text style={styles.navLabel}>
                    {item.label}
                  </Text>
                )
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default NavBar; 