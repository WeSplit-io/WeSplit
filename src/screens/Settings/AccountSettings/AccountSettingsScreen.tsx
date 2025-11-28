import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Image,
  Platform,
  ActionSheetIOS,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../../context/AppContext';
import { colors, spacing, typography } from '../../../theme';
import * as ImagePicker from 'expo-image-picker';
import { accountDeletionService, DeletionProgress, AccountDeletionService } from '../../../services/core';
import { AvatarUploadFallbackService } from '../../../services/core/avatarUploadFallbackService';
import { logger } from '../../../services/analytics/loggingService';
import styles from './styles';
import { Container, Button, Input, PhosphorIcon } from '../../../components/shared';
import Header from '../../../components/shared/Header';
import { authService } from '../../../services/auth/AuthService';
import { normalizePhoneNumber, isValidPhoneNumber } from '../../../utils/validation/phone';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhoneInputModal from '../../../components/auth/PhoneInputModal';

interface AccountSettingsScreenProps {
  navigation: any;
}

const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ navigation }) => {
  const { state, updateUser, logoutUser } = useApp();
  const { currentUser } = state;
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Form states
  const [pseudo, setPseudo] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [avatar, setAvatar] = useState<string | null>(currentUser?.avatar || null);
  const [showBadgesOnProfile, setShowBadgesOnProfile] = useState(currentUser?.show_badges_on_profile !== false);
  const [pseudoError, setPseudoError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [showPhoneInputModal, setShowPhoneInputModal] = useState(false);
  
  // Account deletion states
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<DeletionProgress | null>(null);
  
  // Avatar upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Update form values when currentUser changes
  useEffect(() => {
    setPseudo(currentUser?.name || '');
    setEmail(currentUser?.email || '');
    setPhoneNumber(currentUser?.phone || '');
    setAvatar(currentUser?.avatar || null);
    setShowBadgesOnProfile(currentUser?.show_badges_on_profile !== false);
  }, [currentUser]);

  // Track changes
  useEffect(() => {
    const originalPseudo = currentUser?.name || '';
    const originalAvatar = currentUser?.avatar || null;
    const originalShowBadges = currentUser?.show_badges_on_profile !== false;
    
    const hasModifications = 
      pseudo !== originalPseudo || 
      avatar !== originalAvatar ||
      showBadgesOnProfile !== originalShowBadges;
    
    setHasChanges(hasModifications);
  }, [pseudo, avatar, showBadgesOnProfile, currentUser]);

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
        avatar: finalAvatarUrl,
        show_badges_on_profile: showBadgesOnProfile
      });
      
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
      if (phoneNumber && currentUser?.id) {
        try {
          const promptShownKey = `phone_prompt_shown_${currentUser.id}`;
          await AsyncStorage.removeItem(promptShownKey);
          logger.info('Phone reminder badge cleared', { userId: currentUser.id }, 'AccountSettingsScreen');
        } catch (error) {
          logger.warn('Failed to clear phone reminder badge', error as Record<string, unknown>, 'AccountSettingsScreen');
        }
      }
      
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
      
      // Get data summary
      const summary = await AccountDeletionService.getUserDataSummary(currentUser.id.toString()) as {
        splits: number;
        notifications: number;
        transactions: number;
        groups: number;
        contacts: number;
        wallets: number;
        payments: number;
        settlements: number;
        totalItems: number;
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

      const result = await AccountDeletionService.deleteUserAccount(
        currentUser.id.toString(),
        (progress) => {
          setDeletionProgress(progress);
        }
      );

      setIsDeletingAccount(false);
      setDeletionProgress(null);

      if (result.success) {
        Alert.alert(
          'Account Deleted',
          `Your account has been successfully deleted.\n\nDeleted ${result.totalDeleted} items across ${result.deletedCollections.length} collections.`,
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
        const errorMessage = result.errors.length > 0 
          ? result.errors.join('\n\n')
          : 'Unknown error occurred during deletion';
        
        Alert.alert(
          'Deletion Failed',
          `Some data could not be deleted:\n\n${errorMessage}\n\nPlease contact support if this issue persists.`,
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
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : currentUser?.avatar ? (
                <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <PhosphorIcon name="Camera" size={48} color={colors.white70} />
                </View>
              )}
              {(avatar || currentUser?.avatar) && (
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cameraIconContainer}
                >
                  <PhosphorIcon name="PencilSimple" size={16} color={colors.black} weight="regular" />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

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
            editable={false}
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

          {/* Customize Appearance Section */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={{
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.regular,
              color: colors.white80,
              marginBottom: spacing.md,
            }}>
              Customize Appearance
            </Text>
            
            {/* Profile Borders Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.white5,
                borderRadius: spacing.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }}
              onPress={() => navigation.navigate('AssetSelection', { assetType: 'profile_border' })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PhosphorIcon name="CircleHalf" size={20} color={colors.white} weight="regular" />
                <Text style={{
                  color: colors.white,
                  fontSize: typography.fontSize.md,
                  marginLeft: spacing.sm,
                }}>
                  Profile Borders
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {currentUser?.active_profile_border && (
                  <View style={{
                    backgroundColor: colors.green,
                    paddingHorizontal: spacing.xs,
                    paddingVertical: 2,
                    borderRadius: spacing.xs,
                    marginRight: spacing.sm,
                  }}>
                    <Text style={{
                      color: colors.black,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                    }}>
                      Active
                    </Text>
                  </View>
                )}
                <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
              </View>
            </TouchableOpacity>

            {/* Wallet Backgrounds Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.white5,
                borderRadius: spacing.md,
                padding: spacing.md,
              }}
              onPress={() => navigation.navigate('AssetSelection', { assetType: 'wallet_background' })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PhosphorIcon name="ImageSquare" size={20} color={colors.white} weight="regular" />
                <Text style={{
                  color: colors.white,
                  fontSize: typography.fontSize.md,
                  marginLeft: spacing.sm,
                }}>
                  Balance Card Background
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {currentUser?.active_wallet_background && (
                  <View style={{
                    backgroundColor: colors.green,
                    paddingHorizontal: spacing.xs,
                    paddingVertical: 2,
                    borderRadius: spacing.xs,
                    marginRight: spacing.sm,
                  }}>
                    <Text style={{
                      color: colors.black,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.bold,
                    }}>
                      Active
                    </Text>
                  </View>
                )}
                <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
              </View>
            </TouchableOpacity>

            {/* Asset count info */}
            {(currentUser?.profile_borders?.length || currentUser?.wallet_backgrounds?.length) ? (
              <Text style={{
                color: colors.white50,
                fontSize: typography.fontSize.sm,
                marginTop: spacing.sm,
                textAlign: 'center',
              }}>
                You own {currentUser?.profile_borders?.length || 0} border{(currentUser?.profile_borders?.length || 0) !== 1 ? 's' : ''} and {currentUser?.wallet_backgrounds?.length || 0} background{(currentUser?.wallet_backgrounds?.length || 0) !== 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={{
                color: colors.white50,
                fontSize: typography.fontSize.sm,
                marginTop: spacing.sm,
                textAlign: 'center',
              }}>
                Earn customization assets through the Advent Calendar
              </Text>
            )}
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

          {/* Extra space for bottom padding */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      {/* Fixed Save Button at Bottom */}
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