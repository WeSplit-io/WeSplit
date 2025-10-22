import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  Image,
  Platform,
  ActionSheetIOS,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import * as ImagePicker from 'expo-image-picker';
import AccountDeletionService, { DeletionProgress } from '../../services/accountDeletionService';
import { UserImageService } from '../../services/userImageService';
import { logger } from '../../services/loggingService';
import styles from './styles';
import { Container } from '../../components/shared';


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
  const [avatar, setAvatar] = useState<string | null>(currentUser?.avatar || null);
  const [pseudoError, setPseudoError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Account deletion states
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<DeletionProgress | null>(null);
  
  // Avatar upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Update form values when currentUser changes
  useEffect(() => {
    setPseudo(currentUser?.name || '');
    setEmail(currentUser?.email || '');
    setAvatar(currentUser?.avatar || null);
  }, [currentUser]);

  // Track changes
  useEffect(() => {
    const originalPseudo = currentUser?.name || '';
    const originalAvatar = currentUser?.avatar || null;
    
    const hasModifications = 
      pseudo !== originalPseudo || 
      avatar !== originalAvatar;
    
    setHasChanges(hasModifications);
  }, [pseudo, avatar, currentUser]);

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
        const uploadResult = await UserImageService.uploadUserAvatar(
          currentUser.id.toString(), 
          avatar
        );
        
        if (uploadResult.success && uploadResult.imageUrl) {
          finalAvatarUrl = uploadResult.imageUrl;
          logger.info('Avatar uploaded successfully', null, 'AccountSettingsScreen');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload avatar');
          return;
        }
      } else if (avatar === null && currentUser.avatar) {
        // Avatar was removed
        logger.info('Removing avatar', null, 'AccountSettingsScreen');
        const deleteResult = await UserImageService.deleteUserAvatar(currentUser.id.toString());
        
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
        avatar: finalAvatarUrl
      });
      
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
      <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Image
            source={require('../../../assets/chevron-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account info</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Picture */}
          <View style={styles.profilePictureContainer}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : currentUser?.avatar ? (
                <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Image source={require('../../../assets/camera-icon.png')} style={styles.avatarIcon} />
                </View>
              )}
              {(avatar || currentUser?.avatar) && (
                <View style={styles.cameraIconContainer}>
                  <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmodify-icon-white.png?alt=media&token=4b1aa40d-4d81-4e40-9d3b-9638bc589e21' }} style={styles.cameraIcon} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Pseudo Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pseudo*</Text>
            <TextInput
              style={[styles.input, pseudoError ? styles.inputError : null]}
              value={pseudo}
              onChangeText={handlePseudoChange}
              placeholder="Enter your pseudo"
              placeholderTextColor="#A89B9B"
            />
            {pseudoError && <Text style={styles.errorText}>{pseudoError}</Text>}
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#A89B9B"
              editable={false}
            />
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
              <Icon name="trash-2" size={20} color="#FF6B6B" />
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
              borderColor: colors.border,
            }}>
              <Text style={{
                color: colors.textLight,
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
        <TouchableOpacity 
          onPress={handleSaveProfile}
          disabled={!hasChanges || isUploadingAvatar}
        >
          <LinearGradient
            colors={(!hasChanges || isUploadingAvatar) ? [colors.white10, colors.white10] : [colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {isUploadingAvatar ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={[
                styles.saveButtonText,
                (!hasChanges || isUploadingAvatar) && styles.saveButtonTextDisabled
              ]}>Save</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Container>
  );
};

export default AccountSettingsScreen; 