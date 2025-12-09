import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActionSheetIOS,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../../context/AppContext';
import { colors, spacing, typography } from '../../../theme';
import * as ImagePicker from 'expo-image-picker';
import { accountDeletionService } from '../../../services/core';
import { AvatarUploadFallbackService } from '../../../services/core/avatarUploadFallbackService';
import { logger } from '../../../services/analytics/loggingService';
import styles from './styles';
import { Container, Button, Input, PhosphorIcon } from '../../../components/shared';
import Header from '../../../components/shared/Header';
import Avatar from '../../../components/shared/Avatar';
import { getAssetInfo } from '../../../services/rewards/assetConfig';
import { resolveStorageUrl } from '../../../services/shared/storageUrlService';
import AssetSelectionModal from '../AssetSelection/AssetSelectionModal';
import { SvgUri } from 'react-native-svg';

interface AccountSettingsScreenProps {
  navigation: any;
}

const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ navigation }) => {
  const { state, updateUser, logoutUser, refreshUser } = useApp();
  const { currentUser } = state;
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Track last refresh time to avoid excessive refreshes
  const lastRefreshRef = useRef<number>(0);

  // Determine auth method
  const authMethod = state.authMethod || 'email';

  // Form states
  const [pseudo, setPseudo] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatar, setAvatar] = useState<string | null>(currentUser?.avatar || null);
  const [showBadgesOnProfile, setShowBadgesOnProfile] = useState(currentUser?.show_badges_on_profile !== false);
  const [pseudoError, setPseudoError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'infos' | 'appearance'>('infos');
  const [showAssetSelectionModal, setShowAssetSelectionModal] = useState(false);
  const [assetSelectionType, setAssetSelectionType] = useState<'profile_border' | 'wallet_background' | null>(null);
  const [walletBackgroundUrl, setWalletBackgroundUrl] = useState<string | null>(null);
  const [borderPreviewUrl, setBorderPreviewUrl] = useState<string | null>(null);
  
  // Account deletion states
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<{ currentStep: string; progress: number; currentCollection: string } | null>(null);
  
  // Avatar upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Update form values when currentUser changes
  useEffect(() => {
    setPseudo(currentUser?.name || '');
    setEmail(currentUser?.email || '');
    setAvatar(currentUser?.avatar || null);
    setShowBadgesOnProfile(currentUser?.show_badges_on_profile !== false);
  }, [currentUser]);

  // Load wallet background URL
  useEffect(() => {
    const loadWalletBackground = async () => {
      if (!currentUser?.active_wallet_background) {
        setWalletBackgroundUrl(null);
        return;
      }

      try {
        const assetInfo = getAssetInfo(currentUser.active_wallet_background);
        if (assetInfo?.url) {
          const resolvedUrl = await resolveStorageUrl(assetInfo.url, { assetId: currentUser.active_wallet_background });
          setWalletBackgroundUrl(resolvedUrl || null);
        }
      } catch (error) {
        logger.warn('Failed to load wallet background', { error }, 'AccountSettingsScreen');
        setWalletBackgroundUrl(null);
      }
    };

    loadWalletBackground();
  }, [currentUser?.active_wallet_background]);

  // Load border preview URL
  useEffect(() => {
    const loadBorderPreview = async () => {
      if (!currentUser?.active_profile_border) {
        setBorderPreviewUrl(null);
        return;
      }

      try {
        const assetInfo = getAssetInfo(currentUser.active_profile_border);
        if (assetInfo?.url) {
          const resolvedUrl = await resolveStorageUrl(assetInfo.url, { assetId: currentUser.active_profile_border });
          setBorderPreviewUrl(resolvedUrl || null);
        }
      } catch (error) {
        logger.warn('Failed to load border preview', { error }, 'AccountSettingsScreen');
        setBorderPreviewUrl(null);
      }
    };

    loadBorderPreview();
  }, [currentUser?.active_profile_border]);

  // Refresh user data when screen comes into focus (throttled to avoid excessive calls)
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserData = async () => {
        const now = Date.now();
        // Only refresh if it's been more than 30 seconds since last refresh
        if (now - lastRefreshRef.current < 30000) {
          return;
        }
        lastRefreshRef.current = now;

        try {
          logger.debug('Refreshing user data on AccountSettingsScreen focus', {
            currentProfileBorders: currentUser?.profile_borders,
            currentWalletBackgrounds: currentUser?.wallet_backgrounds,
            currentUserId: currentUser?.id
          }, 'AccountSettingsScreen');

          await refreshUser();

          logger.debug('User data refreshed on AccountSettingsScreen focus', {
            newProfileBorders: currentUser?.profile_borders,
            newWalletBackgrounds: currentUser?.wallet_backgrounds,
            currentUserId: currentUser?.id
          }, 'AccountSettingsScreen');
        } catch (error) {
          logger.error('Failed to refresh user data on focus', { error }, 'AccountSettingsScreen');
          // Reset timestamp on error so we can retry sooner
          lastRefreshRef.current = 0;
        }
      };

      refreshUserData();
    }, [refreshUser, currentUser?.id])
  );

  // Track changes
  useEffect(() => {
    const originalPseudo = currentUser?.name || '';
    const originalEmail = currentUser?.email || '';
    const originalAvatar = currentUser?.avatar || null;
    const originalShowBadges = currentUser?.show_badges_on_profile !== false;

    const hasModifications =
      pseudo !== originalPseudo ||
      email !== originalEmail ||
      avatar !== originalAvatar ||
      showBadgesOnProfile !== originalShowBadges;

    setHasChanges(hasModifications);
  }, [pseudo, email, avatar, showBadgesOnProfile, currentUser]);

  const handlePickImage = () => {
    const options = avatar 
      ? ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel']
      : ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = avatar ? 2 : -1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openCamera();
          } else if (buttonIndex === 1) {
            openImageLibrary();
          } else if (avatar && buttonIndex === 2) {
            setAvatar(null);
          }
        }
      );
    } else {
      // For Android, show Alert
      if (avatar) {
        Alert.alert(
          'Select Avatar',
          'Choose how you want to select your profile picture',
          [
            { text: 'Take Photo', onPress: openCamera },
            { text: 'Choose from Library', onPress: openImageLibrary },
            { text: 'Remove Photo', onPress: () => setAvatar(null) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(
          'Select Avatar',
          'Choose how you want to select your profile picture',
          [
            { text: 'Take Photo', onPress: openCamera },
            { text: 'Choose from Library', onPress: openImageLibrary },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    }
  };

  const openCamera = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openImageLibrary = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!pseudo.trim()) {
      Alert.alert('Error', 'Pseudo cannot be empty');
      return;
    }
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }
    
    try {
      setIsUploadingAvatar(true);
      
      let finalAvatarUrl = currentUser.avatar;
      
      // If avatar has changed and is a local URI, upload it
      if (avatar && avatar !== currentUser.avatar && avatar.startsWith('file://')) {
        logger.info('Uploading new avatar', null, 'AccountSettingsScreen');
        const uploadResult = await AvatarUploadFallbackService.uploadAvatarWithFallback(
          currentUser.id.toString(), 
          avatar
        );
        
        if (uploadResult.success && uploadResult.avatarUrl) {
          finalAvatarUrl = uploadResult.avatarUrl;
          
          if (uploadResult.isFallback) {
            logger.info('Avatar uploaded with fallback (local storage)', null, 'AccountSettingsScreen');
            // Show a gentle warning that it's stored locally
            Alert.alert(
              'Avatar Updated', 
              'Your avatar has been updated and is stored locally. It will be uploaded to cloud storage when possible.',
              [{ text: 'OK' }]
            );
          } else {
            logger.info('Avatar uploaded successfully to Firebase', null, 'AccountSettingsScreen');
          }
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload avatar');
          return;
        }
      } else if (avatar === null && currentUser.avatar) {
        // Avatar was removed
        logger.info('Removing avatar', null, 'AccountSettingsScreen');
        const deleteResult = await AvatarUploadFallbackService.deleteAvatar(currentUser.id.toString());
        
        if (deleteResult.success) {
          finalAvatarUrl = '';
          logger.info('Avatar removed successfully', null, 'AccountSettingsScreen');
        } else {
          console.warn('🗑️ AccountSettings: Failed to remove avatar:', deleteResult.error);
          // Continue with profile update even if avatar deletion fails
        }
      }
      
      // Update user profile
      await updateUser({
        ...currentUser,
        name: pseudo.trim(),
        email: email.trim(),
        avatar: finalAvatarUrl,
        show_badges_on_profile: showBadgesOnProfile
      });

      // If email was added/changed, save it to EmailPersistenceService for future logins
      if (email.trim() && email.trim() !== currentUser?.email) {
        try {
          const { AuthPersistenceService } = await import('../../../services/core/authPersistenceService');
          await AuthPersistenceService.saveEmail(email.trim());
          logger.info('Email saved to persistence after profile update', { email: email.trim() }, 'AccountSettingsScreen');
        } catch (emailSaveError) {
          logger.warn('Failed to save email to persistence after profile update (non-critical)', emailSaveError as Record<string, unknown>, 'AccountSettingsScreen');
          // Non-critical, continue with profile update
        }
      }
      
      // Sync profile image quest completion if avatar was added
      if (finalAvatarUrl && finalAvatarUrl !== currentUser.avatar) {
        try {
          const { userActionSyncService } = await import('../../../services/rewards/userActionSyncService');
          await userActionSyncService.syncProfileImage(currentUser.id.toString(), finalAvatarUrl);
        } catch (syncError) {
          logger.error('❌ Error syncing profile image quest', syncError as Record<string, unknown>, 'AccountSettingsScreen');
          // Don't fail the profile update if sync fails
        }
      }
      
      // Clear phone reminder badge if phone was added
      // Note: AsyncStorage import removed - implement if needed
      
      Alert.alert('Success', 'Profile updated successfully');
      nav.goBack();
    } catch (error) {
      console.error('❌ AccountSettings: Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    // First, show a warning about data deletion
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and ALL associated data including:\n\n• All your splits and transactions\n• Group memberships\n• Payment history\n• Notifications\n• Contacts\n\nThis action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Show Data Summary', 
          onPress: () => showDataSummaryAndConfirm()
        }
      ]
    );
  };

  const showDataSummaryAndConfirm = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    try {
      setIsDeletingAccount(true);
      
      // Get data summary - TODO: Implement proper data summary service
      const summary = {
        splits: 0,
        notifications: 0,
        transactions: 0,
        groups: 0,
        contacts: 0,
        wallets: 0,
        payments: 0,
        settlements: 0,
        totalItems: 0,
      };
      
      setIsDeletingAccount(false);
      
      const summaryText = `Your account contains:\n\n• ${summary.splits} splits\n• ${summary.notifications} notifications\n• ${summary.transactions} transactions\n• ${summary.groups} groups\n• ${summary.contacts} contacts\n• ${summary.wallets} wallets\n• ${summary.payments} payment requests\n• ${summary.settlements} settlements\n\nTotal: ${summary.totalItems} items will be deleted.`;
      
      Alert.alert(
        'Data Summary',
        summaryText,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete Everything', 
            style: 'destructive', 
            onPress: () => confirmAccountDeletion()
          }
        ]
      );
    } catch (error) {
      setIsDeletingAccount(false);
      Alert.alert('Error', 'Failed to load data summary. Please try again.');
    }
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      'Final Confirmation',
      'This is your last chance to cancel. Your account and ALL data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'DELETE ACCOUNT', 
          style: 'destructive', 
          onPress: () => performAccountDeletion()
        }
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeletionProgress(null);

      // TODO: Implement proper account deletion with progress callback
      const result = await accountDeletionService.deleteUserAccount({
        userId: currentUser.id.toString(),
        confirmationCode: 'DELETE_CONFIRMED',
      });
      
      // Mock progress for now
      setDeletionProgress({
        currentStep: 'Deleting account...',
        progress: 50,
        currentCollection: 'users'
      });

      setIsDeletingAccount(false);
      setDeletionProgress(null);

      if (result.success) {
        Alert.alert(
          'Account Deleted',
          `Your account has been successfully deleted.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear user context and navigate to auth
                logoutUser();
                navigation.navigate('AuthMethods');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Deletion Failed',
          `Failed to delete account: ${result.message}\n\nPlease contact support if this issue persists.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsDeletingAccount(false);
      setDeletionProgress(null);
      
      Alert.alert(
        'Deletion Error',
        `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleBackPress = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => nav.goBack() }
        ]
      );
    } else {
      nav.goBack();
    }
  };

  const handlePseudoChange = (text: string) => {
    setPseudo(text);
    // Only show error if it's not the current user's pseudo
    if (text === currentUser?.name) {
      setPseudoError('');
    } else if (text === 'PauluneMoon') {
      setPseudoError('Pseudo is already taken');
    } else {
      setPseudoError('');
    }
  };

  const displayName = currentUser?.name || 'PauluneMoon';

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      {/* Header */}
      <Header 
        title="Account info"
        onBackPress={handleBackPress}
        showBackButton={true}
      />

      {/* Main Content */}
      <View style={styles.mainContent}>
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl * 2 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture */}
          <View style={styles.profilePictureContainer}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              <Avatar
                userId={currentUser?.id?.toString()}
                userName={displayName}
                avatarUrl={avatar || currentUser?.avatar || undefined}
                size={140}
                style={styles.avatarImage}
                showProfileBorder
              />
              {!(avatar || currentUser?.avatar) && (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { position: 'absolute', top: 0, left: 0 },
                  ]}
                >
                  <PhosphorIcon name="Camera" size={48} color={colors.white70} />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickImage}>
              <Text style={styles.updateProfileText}>Update Profile Picture</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs - Custom 100% width tabs */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsWrapper}>
              {[
                { label: 'Infos', value: 'infos' },
                { label: 'Appearance', value: 'appearance' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.value}
                  style={[styles.tabItem, activeTab === tab.value && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.value as 'infos' | 'appearance')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.value && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {activeTab === tab.value && (
                    <LinearGradient
                      colors={[colors.green, colors.greenBlue]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tabIndicator}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.tabUnderline} />
          </View>

          {/* Tab Content */}
          {activeTab === 'infos' && (
            <>
              {/* Pseudo Field */}
              <Input
                label="Pseudo*"
                value={pseudo}
                onChangeText={handlePseudoChange}
                placeholder="Enter your pseudo"
                error={pseudoError || undefined}
              />

              {/* Email Field */}
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                editable={true}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Phone Number Field - Temporarily hidden */}
              {/* {phoneNumber ? (
                <Input
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+1234567890"
                  keyboardType="phone-pad"
                  editable={false}
                />
              ) : (
                <View>
                  <Text style={{
                    fontSize: typography.fontSize.md,
                    fontWeight: typography.fontWeight.regular,
                    color: colors.white80,
                    marginBottom: spacing.md,
                  }}>
                    Phone Number
                  </Text>
                  <Button
                    title="Add Phone Number"
                    onPress={() => {
                      setShowPhoneInputModal(true);
                    }}
                    variant="secondary"
                    size="medium"
                    style={{ marginBottom: spacing.md }}
                  />
                </View>
              )} */}

              {/* Settings Section */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={{
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.regular,
                  color: colors.white80,
                  marginBottom: spacing.md,
                }}>
                  Settings
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: colors.white5,
                  borderRadius: spacing.md,
                  padding: spacing.md,
                }}>
                  <Text style={{
                    color: colors.white,
                    fontSize: typography.fontSize.md,
                  }}>
                    Show badges on my profile
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowBadgesOnProfile(!showBadgesOnProfile)}
                    style={{
                      width: 58,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: showBadgesOnProfile ? 'transparent' : colors.white10,
                      justifyContent: 'center',
                      paddingHorizontal: 2,
                      overflow: 'hidden',
                    }}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: showBadgesOnProfile }}
                  >
                    {showBadgesOnProfile ? (
                      <LinearGradient
                        colors={[colors.green, colors.greenBlue]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 15,
                          justifyContent: 'center',
                          paddingHorizontal: 2,
                        }}
                      >
                        <View style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: colors.white,
                          alignSelf: 'flex-end',
                        }} />
                      </LinearGradient>
                    ) : (
                      <View style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: colors.white,
                        alignSelf: 'flex-start',
                      }} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delete Account Button */}
              <TouchableOpacity 
                style={[styles.deleteAccountButton, isDeletingAccount && { opacity: 0.6 }]} 
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#FF6B6B" />
                ) : (
                  <PhosphorIcon name="Trash" size={20} color="#FF6B6B" weight="regular" />
                )}
                <Text style={[styles.deleteAccountText, isDeletingAccount && { opacity: 0.6 }]}>
                  {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>

              {/* Deletion Progress */}
              {deletionProgress && (
                <View style={{
                  backgroundColor: colors.white5,
                  borderRadius: spacing.md,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                  borderWidth: 1,
                  borderColor: colors.white10,
                }}>
                  <Text style={{
                    color: colors.white,
                    fontSize: 14,
                    fontWeight: '500',
                    marginBottom: spacing.sm,
                    textAlign: 'center',
                  }}>
                    {deletionProgress.currentStep} ({Math.round(deletionProgress.progress)}%)
                  </Text>
                  <View style={{
                    height: 4,
                    backgroundColor: colors.white10,
                    borderRadius: 2,
                    marginBottom: spacing.sm,
                    overflow: 'hidden',
                  }}>
                    <View 
                      style={{
                        height: '100%',
                        backgroundColor: '#FF6B6B',
                        borderRadius: 2,
                        width: `${deletionProgress.progress}%`
                      }} 
                    />
                  </View>
                  <Text style={{
                    color: colors.white70,
                    fontSize: 12,
                    textAlign: 'center',
                  }}>
                    Processing {deletionProgress.currentCollection}...
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'appearance' && (
            <View style={{ marginTop: spacing.md }}>
              {/* Profile Border Section */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.white,
                  marginBottom: spacing.xs,
                }}>
                  Profile Border
                </Text>
                <Text style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.white70,
                  marginBottom: spacing.md,
                }}>
                  Select a border to display around your avatar
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.white5,
                    borderRadius: spacing.md,
                    padding: spacing.md,
                  }}
                  onPress={() => {
                    setAssetSelectionType('profile_border');
                    setShowAssetSelectionModal(true);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: spacing.xs,
                      marginRight: spacing.md,
                      backgroundColor: colors.white5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {borderPreviewUrl ? (() => {
                        const isSvg = borderPreviewUrl.toLowerCase().includes('.svg');
                        if (isSvg) {
                          return (
                            <SvgUri
                              uri={borderPreviewUrl}
                              width={48}
                              height={48}
                            />
                          );
                        } else {
                          return (
                            <Image
                              source={{ uri: borderPreviewUrl }}
                              style={{ width: 48, height: 48 }}
                              resizeMode="contain"
                            />
                          );
                        }
                      })() : (
                        <PhosphorIcon name="CircleHalf" size={24} color={colors.white70} weight="regular" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: colors.white,
                        fontSize: typography.fontSize.md,
                        fontWeight: typography.fontWeight.medium,
                      }}>
                        {currentUser?.active_profile_border 
                          ? (getAssetInfo(currentUser.active_profile_border)?.name || 'Custom Border')
                          : 'No Border'}
                      </Text>
                      <Text style={{
                        color: colors.white50,
                        fontSize: typography.fontSize.sm,
                        marginTop: 2,
                      }}>
                        {currentUser?.profile_borders && currentUser.profile_borders.length > 0
                          ? `${currentUser.profile_borders.length} border${currentUser.profile_borders.length > 1 ? 's' : ''} available`
                          : 'Claim borders from the Advent Calendar'}
                      </Text>
                    </View>
                  </View>
                  <PhosphorIcon name="PencilSimpleLine" size={20} color={colors.white70} weight="regular" />
                </TouchableOpacity>
              </View>

              {/* Wallet Background Section */}
              <View>
                <Text style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.white,
                  marginBottom: spacing.xs,
                  marginTop: spacing.md,
                }}>
                  Wallet Background
                </Text>
                <Text style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.white70,
                  marginBottom: spacing.md,
                }}>
                  Select a background for your balance card
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.white5,
                    borderRadius: spacing.md,
                    padding: spacing.md,
                  }}
                  onPress={() => {
                    setAssetSelectionType('wallet_background');
                    setShowAssetSelectionModal(true);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 48,
                      height: 32,
                      borderRadius: spacing.xs,
                      backgroundColor: colors.white10,
                      marginRight: spacing.md,
                      overflow: 'hidden',
                    }}>
                      {walletBackgroundUrl ? (
                        <Image
                          source={{ uri: walletBackgroundUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: colors.white10 }} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: colors.white,
                        fontSize: typography.fontSize.md,
                        fontWeight: typography.fontWeight.medium,
                      }}>
                        {currentUser?.active_wallet_background 
                          ? (getAssetInfo(currentUser.active_wallet_background)?.name || 'Custom Background')
                          : 'Default Background'}
                      </Text>
                      <Text style={{
                        color: colors.white50,
                        fontSize: typography.fontSize.sm,
                        marginTop: 2,
                      }}>
                        {currentUser?.wallet_backgrounds && currentUser.wallet_backgrounds.length > 0
                          ? `${currentUser.wallet_backgrounds.length} background${currentUser.wallet_backgrounds.length > 1 ? 's' : ''} available`
                          : 'Claim backgrounds from the Advent Calendar'}
                      </Text>
                    </View>
                  </View>
                  <PhosphorIcon name="PencilSimpleLine" size={20} color={colors.white70} weight="regular" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Extra space for bottom padding */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      {/* Fixed Save Button at Bottom - Only show on Infos tab */}
      {activeTab === 'infos' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title="Save"
            onPress={handleSaveProfile}
            variant="primary"
            disabled={!hasChanges || isUploadingAvatar}
            loading={isUploadingAvatar}
            fullWidth={true}
            style={styles.gradientButton}
          />
        </View>
      )}

      {/* Asset Selection Modal */}
      {showAssetSelectionModal && assetSelectionType && (
        <AssetSelectionModal
          visible={showAssetSelectionModal}
          onClose={async () => {
            setShowAssetSelectionModal(false);
            setAssetSelectionType(null);
            // Refresh user data after closing modal to get updated assets
            try {
              await refreshUser();
              logger.debug('User data refreshed after asset selection modal closed', {
                profileBorders: currentUser?.profile_borders,
                walletBackgrounds: currentUser?.wallet_backgrounds
              }, 'AccountSettingsScreen');
            } catch (error) {
              logger.warn('Failed to refresh user data after asset selection', { error }, 'AccountSettingsScreen');
            }
          }}
          assetType={assetSelectionType}
          maxHeight="60%"
        />
      )}

      {/* Phone Input Modal - Temporarily hidden */}
      {/* <PhoneInputModal
        visible={showPhoneInputModal}
        onDismiss={() => setShowPhoneInputModal(false)}
        onSendCode={async (phone) => {
          try {
            setIsAddingPhone(true);
            
            // Send verification code (pass userId and email to help with auth state)
            const result = await authService.linkPhoneNumberToUser(phone, undefined, currentUser?.id, currentUser?.email);
            
            if (result.success && result.verificationId) {
              setShowPhoneInputModal(false);
              // Navigate to verification screen with linking context
              navigation.navigate('Verification', {
                phoneNumber: phone,
                verificationId: result.verificationId,
                isLinking: true // Flag to indicate this is linking, not new signup
              });
            } else {
              Alert.alert('Error', result.error || 'Failed to send verification code');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to send verification code');
          } finally {
            setIsAddingPhone(false);
          }
        }}
      /> */}
    </Container>
  );
};

export default AccountSettingsScreen; 