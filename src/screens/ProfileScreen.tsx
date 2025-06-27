import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';

const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const { state, logoutUser } = useApp();
  const { disconnectWallet } = useWallet();
  const { currentUser, authMethod } = state;

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Disconnect from wallet if connected
              if (authMethod === 'wallet') {
                await disconnectWallet();
              }
              
              // Logout from app
              logoutUser();
              navigation.replace('Auth');
            } catch (error) {
              console.error('Logout error:', error);
              // Still logout from app even if wallet disconnect fails
              logoutUser();
              navigation.replace('Auth');
            }
          }
        }
      ]
    );
  };

  const options = [
    { icon: 'star', label: 'Premium', action: () => Alert.alert('Premium', 'Upgrade to premium features') },
    { icon: 'share-2', label: 'Share app', action: () => Alert.alert('Share', 'Share WeSplit with friends') },
    { icon: 'star', label: 'Rate app', action: () => Alert.alert('Rate', 'Rate WeSplit on the app store') },
    { icon: 'help-circle', label: 'Help', action: () => Alert.alert('Help', 'Get help and support') },
    { icon: 'file-text', label: 'Terms & Privacy', action: () => Alert.alert('Terms', 'View terms and privacy policy') },
    { icon: 'log-out', label: 'Logout', action: handleLogout },
  ];

  const handleBackToDashboard = () => {
    navigation.navigate('Dashboard');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.profileSection}>
          <Image source={{ uri: currentUser?.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{currentUser?.name}</Text>
          <Text style={styles.email}>{currentUser?.email}</Text>
          {currentUser?.walletAddress && (
            <Text style={styles.walletAddress}>{currentUser.walletAddress}</Text>
          )}
          <Text style={styles.authMethod}>Signed in with {authMethod}</Text>
        </View>

        <View style={styles.optionsSection}>
          {options.map((opt, idx) => (
            <TouchableOpacity key={opt.label} style={styles.optionRow} onPress={opt.action}>
              <Icon name={opt.icon} size={22} color={colors.primary} />
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Icon name="chevron-right" size={20} color={colors.gray} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.backToDashboardButton} onPress={handleBackToDashboard}>
          <Icon name="home" size={20} color={colors.background} />
          <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
    backgroundColor: colors.lightGray,
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: 2,
  },
  email: {
    fontSize: fontSizes.md,
    color: colors.gray,
    marginBottom: spacing.sm,
  },
  walletAddress: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  authMethod: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    marginTop: spacing.sm,
  },
  optionsSection: {
    marginBottom: spacing.xl,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionLabel: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    padding: spacing.md,
  },
  backToDashboardButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    marginLeft: spacing.sm,
  },
});

export default ProfileScreen; 