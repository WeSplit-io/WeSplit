import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../theme';
import Icon from './Icon';

const navItems = [
  { icon: 'home', label: 'Home', route: 'Dashboard' },
  { icon: 'grid', label: 'Groups', route: 'GroupsList' },
  { icon: 'plus', label: 'Add', route: 'CreateGroup', isSpecial: true },
  { icon: 'users', label: 'People', route: 'GroupsList' },
  { icon: 'user', label: 'Profile', route: 'Profile' },
];

interface NavBarProps {
  navigation: any;
  currentRoute?: string;
}

const NavBar: React.FC<NavBarProps> = ({ navigation, currentRoute }) => {
  const handleNavigation = (route: string) => {
    if (route && navigation) {
      navigation.navigate(route);
    }
  };

  const isActiveRoute = (route: string) => {
    return currentRoute === route;
  };

  return (
    <View style={styles.container}>
      <View style={styles.scrollContent}>
        {navItems.map((item, index) => {
          const isActive = isActiveRoute(item.route);
          
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.navItem, item.isSpecial && styles.specialNavItem]} 
              onPress={() => handleNavigation(item.route)}
            >
              {item.isSpecial ? (
                <View style={styles.specialButton}>
                  <Icon name={item.icon} size={24} color={colors.darkBackground} />
                </View>
              ) : (
                <Icon 
                  name={item.icon} 
                  size={24} 
                  color={isActive ? colors.brandGreen : colors.textLight} 
                />
              )}
              {!item.isSpecial && (
                <Text style={[
                  styles.navLabel, 
                  isActive && styles.navLabelActive
                ]}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.darkCard,
    borderTopWidth: 1,
    borderTopColor: colors.darkBorder,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
    flex: 1,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minWidth: 72,
    flex: 1,
  },
  navLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  navLabelActive: {
    color: colors.brandGreen,
  },
  specialNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NavBar; 