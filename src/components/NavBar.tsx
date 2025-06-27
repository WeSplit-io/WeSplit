import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
    onNavigate('AddExpense');
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.navItem} onPress={handleHomePress}>
          <Icon name="home" size={24} color={colors.primary} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleAddPress}>
          <Icon name="plus-circle" size={24} color={colors.primary} />
          <Text style={styles.navLabel}>Add</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('CreateGroup')}>
          <Icon name="users" size={24} color={colors.primary} />
          <Text style={styles.navLabel}>Groups</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleProfilePress}>
          <Icon name="user" size={24} color={colors.primary} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    marginRight: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 72,
  },
  navLabel: {
    fontSize: fontSizes.xs,
    color: colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default NavBar; 