import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import NavIcon from './NavIcon';
import { styles } from './NavBar.styles';
import platformUtils from '../utils/platformUtils';


const isImagePath = (icon: string) => {
  return icon.startsWith('../') || icon.startsWith('./') || icon.includes('.png') || icon.includes('.jpg');
};

const getImageFromPath = (path: string) => {
  const cleanPath = path.replace(/^\.\.\/assets\//, '');
  
  switch (cleanPath) {
    case 'home-icon-default.png':
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhome-icon-default.png?alt=media&token=73d79921-5d1c-4c9e-acdb-7f669321db27' };
    case 'wallet-icon-default.png':
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' };
    case 'split-icon.png':
      return require('../../assets/split-icon.png');
    case 'pool-icon.png':
      return require('../../assets/pool-icon.png');
    case 'users-icon.png':
      return require('../../assets/users-icon.png');
    default:
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffolder-icon-default.png?alt=media&token=4d7d12ca-1b6f-4f42-a594-cb3de91f777a' };
  }
};

const navItems = [
  { icon: 'home-icon-default.png', label: 'Home', route: 'Dashboard' },
  { icon: 'wallet-icon-default.png', label: 'Rewards', route: 'Rewards' },
  // Center green split button -> first step camera
  { icon: 'split-icon.png', label: 'Split', route: 'BillCamera', isSpecial: true },
  // Pools (splits) tab
  { icon: 'pool-icon.png', label: 'Pools', route: 'SplitsList' },
  // Keep Contacts at the end
  { icon: 'users-icon.png', label: 'Contacts', route: 'Contacts' },
];

interface NavBarProps {
  navigation: any;
  currentRoute?: string;
  customStyle?: any;
}

const NavBar: React.FC<NavBarProps> = ({ navigation, currentRoute, customStyle }) => {
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
      console.log(`NavBar: Navigating to ${route}`);
      
      // Handle special navigation cases
      if (route === 'Contacts') {
        // Navigate to standalone contacts screen
        navigation.navigate(route, {});
      } else if (route === 'SplitsList') {
        // Navigate to splits list screen
        navigation.navigate(route, {});
      } else {
        navigation.navigate(route);
      }
    } catch (error) {
      console.error(`NavBar: Error navigating to ${route}:`, error);
    }
  };

  const isActiveRoute = (route: string) => {
    // Handle both exact matches and logical equivalences
    if (currentRoute === route) {
      return true;
    }
    
    // Special cases: logical equivalences for tabs
    if (route === 'Contacts' && currentRoute === 'Contacts') {
      return true;
    }
    if (route === 'SplitsList' && currentRoute === 'SplitsList') {
      return true;
    }
    if (route === 'SplitsList' && currentRoute === 'SplitDetails') {
      return true;
    }
    
    return false;
  };

  return (
    <View style={[styles.container, customStyle]}>
      <View style={styles.scrollContent}>
        {navItems.map((item, index) => {
          const isActive = isActiveRoute(item.route);
          
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.navItem, item.isSpecial && styles.specialNavItem]} 
              onPress={() => handleNavigation(item.route)}
              activeOpacity={platformUtils.touchFeedback.activeOpacity}
            >
              {item.isSpecial ? (
                <LinearGradient
                  colors={[colors.green, '#4CAF50']}
                  style={styles.specialButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image 
                    source={getImageFromPath(item.icon)} 
                    style={styles.specialButtonImage} 
                  />
                </LinearGradient>
              ) : isImagePath(item.icon) ? (
                <Image 
                  source={getImageFromPath(item.icon)} 
                  style={[styles.navIcon, isActive && styles.navIconActive]} 
                />
              ) : (
                <NavIcon 
                  name={item.icon} 
                  size={24} 
                  isActive={isActive}
                />
              )}
              {!item.isSpecial && isActive && (
                <View style={styles.topIndicator} />
              )}
              <Text style={[
                styles.navLabel, 
                isActive && styles.navLabelActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default NavBar; 