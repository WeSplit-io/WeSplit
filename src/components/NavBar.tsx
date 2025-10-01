import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
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
    case 'folder-icon-default.png':
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffolder-icon-default.png?alt=media&token=15b46b57-2d90-4ba3-9e96-2dda32d35c93' };
    case 'wallet-icon-default.png':
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' };
    case 'book-icon-default.png':
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbook-icon-default.png?alt=media&token=ec1254bb-72d6-49eb-a107-5e82b714e031' };
    case 'profile-icon-default.png':
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofile-icon-default.png?alt=media&token=9b2ee114-cfa0-4249-804b-ff4978ba4305' };
    default:
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffolder-icon-default.png?alt=media&token=4d7d12ca-1b6f-4f42-a594-cb3de91f777a' };
  }
};

const navItems = [
  { icon: 'home-icon-default.png', label: 'Home', route: 'Dashboard' },
  { icon: 'wallet-icon-default.png', label: 'Wallet', route: 'WalletManagement' },
  { icon: 'folder-icon-default.png', label: 'Splits', route: 'BillCamera', isSpecial: true },
  { icon: 'book-icon-default.png', label: 'Contact', route: 'Contacts' },
  { icon: 'profile-icon-default.png', label: 'Profile', route: 'Profile' },
];

interface NavBarProps {
  navigation: any;
  currentRoute?: string;
}

const NavBar: React.FC<NavBarProps> = ({ navigation, currentRoute }) => {
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
    
    // Special case: if we're on Contacts, consider Contact tab active
    if (route === 'Contacts' && currentRoute === 'Contacts') {
      return true;
    }
    
    return false;
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
              activeOpacity={platformUtils.touchFeedback.activeOpacity}
            >
              {item.isSpecial ? (
                <View style={styles.specialButton}>
                  <Image 
                    source={getImageFromPath(item.icon)} 
                    style={styles.specialButtonImage} 
                  />
                </View>
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