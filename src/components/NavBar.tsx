import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme';
import NavIcon from './NavIcon';
import { styles } from './NavBar.styles';

// Fonction pour obtenir l'image selon le nom
const getImageSource = (iconName: string) => {
  switch (iconName) {
    case 'home':
      return require('../../assets/home-icon-default.png');
    case 'groups':
      return require('../../assets/folder-icon-default.png');
    default:
      return require('../../assets/folder-icon-default.png');
  }
};

// Fonction pour détecter si c'est un chemin d'image
const isImagePath = (icon: string) => {
  return icon.startsWith('../') || icon.startsWith('./') || icon.includes('.png') || icon.includes('.jpg');
};

// Fonction pour obtenir l'image depuis un chemin
const getImageFromPath = (path: string) => {
  // Supprimer le préfixe '../' et mapper vers les assets disponibles
  const cleanPath = path.replace(/^\.\.\/assets\//, '');
  
  switch (cleanPath) {
    case 'home-icon-default.png':
      return require('../../assets/home-icon-default.png');
    case 'folder-icon-default.png':
      return require('../../assets/folder-icon-default.png');
    case 'wallet-icon-default.png':
      return require('../../assets/wallet-icon-default.png');
    case 'book-icon-default.png':
      return require('../../assets/book-icon-default.png');
    case 'profile-icon-default.png':
      return require('../../assets/profile-icon-default.png');
    default:
      return require('../../assets/folder-icon-default.png');
  }
};

const navItems = [
  { icon: 'home-icon-default.png', label: 'Home', route: 'Dashboard' },
  { icon: 'wallet-icon-default.png', label: 'Wallet', route: 'Wallet' },
  { icon: 'folder-icon-default.png', label: 'Groups', route: 'GroupsList', isSpecial: true },
  { icon: 'book-icon-default.png', label: 'Contact', route: 'SendContacts' },
  { icon: 'profile-icon-default.png', label: 'Profil', route: 'Profile' },
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
      if (route === 'SendContacts') {
        // Navigate to contacts without groupId for general contacts view
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
    
    // Special case: if we're on SendContacts from navbar, consider Contact tab active
    if (route === 'SendContacts' && currentRoute === 'SendContacts') {
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