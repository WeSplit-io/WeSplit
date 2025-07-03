import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '../lib/theme';
import Icon from './Icon';

const navItems = [
  { icon: 'home', label: 'Home' },
  { icon: 'plus-circle', label: 'Add' },
  { icon: 'users', label: 'Groups' },
  { icon: 'user', label: 'Profile' },
];

interface NavBarProps {
  onNavigate: (screen: string) => void;
}

const NavBar: React.FC<NavBarProps> = ({ onNavigate }) => {
  const handleProfilePress = () => {
    onNavigate('Profile');
  };

  const handleHomePress = () => {
    onNavigate('Dashboard');
  };

  const handleAddPress = () => {
    onNavigate('CreateGroup');
  };

  const handleGroupsPress = () => {
    // Navigate to Dashboard since that's where groups are displayed
    onNavigate('Dashboard');
  };

  return (
    <View style={styles.container}>
      <View style={styles.scrollContent}>
        <TouchableOpacity style={styles.navItem} onPress={handleHomePress}>
          <Icon name="home" size={24} color="#FFF" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleAddPress}>
          <Icon name="plus-circle" size={24} color="#FFF" />
          <Text style={styles.navLabel}>Add</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleGroupsPress}>
          <Icon name="users" size={24} color="#FFF" />
          <Text style={styles.navLabel}>Groups</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleProfilePress}>
          <Icon name="user" size={24} color="#FFF" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
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
    fontSize: fontSizes.xs,
    color: '#FFF',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default NavBar; 