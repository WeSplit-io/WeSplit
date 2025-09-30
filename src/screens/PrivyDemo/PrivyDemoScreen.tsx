/**
 * Privy Demo Screen for WeSplit
 * Demonstrates Privy SSO and wallet management capabilities
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { usePrivyAuth } from '../../hooks/usePrivyAuth';
import PrivyLoginButton from '../../components/PrivyLoginButton';
import PrivyWalletManager from '../../components/PrivyWalletManager';
// import PrivyTestComponent from '../../components/PrivyTestComponent';
import { colors, spacing, typography } from '../../theme';

const PrivyDemoScreen: React.FC = () => {
  const {
    authenticated,
    user,
    privyUser,
    getSocialProfile,
    getAuthMethod,
    logout,
  } = usePrivyAuth();

  const [activeTab, setActiveTab] = useState<'auth' | 'wallet' | 'profile'>('auth');

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Success', 'Logged out successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      Alert.alert('Error', errorMessage);
    }
  };

  const renderAuthTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Authentication</Text>
      
      {!authenticated ? (
        <View>
          <Text style={styles.description}>
            Sign in using any of the supported methods below. Privy will handle the authentication flow and create a wallet if needed.
          </Text>
          <PrivyLoginButton
            onLoginSuccess={() => {
              Alert.alert('Success', 'Login successful!');
            }}
            onLoginError={(error) => {
              Alert.alert('Login Error', error);
            }}
          />
        </View>
      ) : (
        <View>
          <Text style={styles.successText}>✅ Successfully authenticated!</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderWalletTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Wallet Management</Text>
      <PrivyWalletManager />
    </View>
  );

  const renderProfileTab = () => {
    if (!authenticated || !user || !privyUser) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <Text style={styles.description}>Please sign in to view profile information.</Text>
        </View>
      );
    }

    const socialProfile = getSocialProfile();
    const authMethod = getAuthMethod();

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        
        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>App User ID:</Text>
          <Text style={styles.profileValue}>{user.id}</Text>
          
          <Text style={styles.profileLabel}>Email:</Text>
          <Text style={styles.profileValue}>{user.email}</Text>
          
          <Text style={styles.profileLabel}>Name:</Text>
          <Text style={styles.profileValue}>{user.name}</Text>
          
          <Text style={styles.profileLabel}>Wallet Address:</Text>
          <Text style={styles.profileValue}>
            {user.wallet_address ? 
              `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}` : 
              'No wallet'
            }
          </Text>
          
          <Text style={styles.profileLabel}>Authentication Method:</Text>
          <Text style={styles.profileValue}>{authMethod}</Text>
          
          {socialProfile && (
            <>
              <Text style={styles.profileLabel}>Social Provider:</Text>
              <Text style={styles.profileValue}>{socialProfile.provider}</Text>
              
              {socialProfile.name && (
                <>
                  <Text style={styles.profileLabel}>Social Name:</Text>
                  <Text style={styles.profileValue}>{socialProfile.name}</Text>
                </>
              )}
            </>
          )}
          
          <Text style={styles.profileLabel}>Email Verified:</Text>
          <Text style={styles.profileValue}>
            {user.emailVerified ? '✅ Yes' : '❌ No'}
          </Text>
          
          <Text style={styles.profileLabel}>Onboarding Completed:</Text>
          <Text style={styles.profileValue}>
            {user.hasCompletedOnboarding ? '✅ Yes' : '❌ No'}
          </Text>
          
          <Text style={styles.profileLabel}>Last Login:</Text>
          <Text style={styles.profileValue}>
            {new Date(user.lastLoginAt).toLocaleString()}
          </Text>
        </View>

        <View style={styles.privyInfoCard}>
          <Text style={styles.infoTitle}>Privy User Information</Text>
          <Text style={styles.infoText}>Privy User ID: {privyUser.id}</Text>
          <Text style={styles.infoText}>
            Privy Email: {privyUser.email?.address || 'No email'}
          </Text>
          <Text style={styles.infoText}>
            Privy Wallet: {privyUser.wallet?.address ? 
              `${privyUser.wallet.address.slice(0, 6)}...${privyUser.wallet.address.slice(-4)}` : 
              'No wallet'
            }
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privy Integration Demo</Text>
      
      {/* <PrivyTestComponent /> */}
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'auth' && styles.activeTab]}
          onPress={() => setActiveTab('auth')}
        >
          <Text style={[styles.tabText, activeTab === 'auth' && styles.activeTabText]}>
            Authentication
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && styles.activeTab]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.activeTabText]}>
            Wallet
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'auth' && renderAuthTab()}
        {activeTab === 'wallet' && renderWalletTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.darkCard,
    marginHorizontal: spacing.md,
    borderRadius: 8,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primaryGreen,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLightSecondary,
  },
  activeTabText: {
    color: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  tabContent: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  successText: {
    fontSize: typography.fontSize.lg,
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  profileCard: {
    backgroundColor: colors.darkCard,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  profileLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  profileValue: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  privyInfoCard: {
    backgroundColor: colors.darkCardSecondary,
    borderRadius: 8,
    padding: spacing.md,
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
  },
});

export default PrivyDemoScreen;
