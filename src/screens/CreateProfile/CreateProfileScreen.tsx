import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/data';
import { walletService } from '../../services/blockchain/wallet';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { colors, spacing } from '../../theme';
import { AvatarUploadFallbackService } from '../../services/core/avatarUploadFallbackService';
import { DEFAULT_AVATAR_URL } from '../../config/constants/constants';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';
import Header from '../../components/shared/Header';
import PhosphorIcon from '../../components/shared/PhosphorIcon';

const CreateProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateUser, state } = useApp();

  // Debug logging
  useEffect(() => {
    console.log('🔍 CreateProfileScreen: Screen mounted');
    console.log('🔍 CreateProfileScreen: Route params:', route.params);
    console.log('🔍 CreateProfileScreen: State:', state);
  }, []);

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

  const handleNext = async () => {
    try {
      logger.info('Next pressed', null, 'CreateProfileScreen');
      if (!pseudo) {
        setError('Pseudo is required');
        return;
      }
      
      // Prevent multiple submissions
      if (isLoading) {
        logger.debug('Already processing, ignoring duplicate request', null, 'CreateProfileScreen');
        return;
      }
      
      setError('');
      setIsLoading(true);

      // Get email from route/context or authenticated user
      const email = (route?.params as any)?.email || state.currentUser?.email || 'user@example.com';

      // Check if user already exists and has a username
      try {
        const existingUser = await firebaseDataService.user.getUserByEmail(email);
        
        if (existingUser && existingUser.name && existingUser.name.trim() !== '') {
          logger.info('User already has username, skipping profile creation', { name: existingUser.name }, 'CreateProfileScreen');
          
          // User already has a username, authenticate them directly
          const user = {
            id: existingUser.id.toString(),
            name: existingUser.name,
            email: existingUser.email,
            avatar: existingUser.avatar || DEFAULT_AVATAR_URL,
            walletAddress: existingUser.wallet_address,
            wallet_address: existingUser.wallet_address,
            wallet_public_key: existingUser.wallet_public_key,
            created_at: existingUser.created_at,
            hasCompletedOnboarding: true
          };

          authenticateUser(user, 'email');
          
          try {
            (navigation as any).replace('Dashboard');
          } catch (e) {
            console.error('Navigation error:', e);
            Alert.alert('Navigation Error', 'Navigation error: ' + (e as any).message);
          }
          return;
        }
      } catch (error) {
        logger.warn('Could not check existing user, proceeding with profile creation', null, 'CreateProfileScreen');
      }

      // Create or update user using unified service
      try {
        const userData = {
          email,
          name: pseudo,
          avatar: avatar || undefined,
        };

        logger.info('Creating/updating user with firebase service', { email, name: pseudo }, 'CreateProfileScreen');
        
        // First check if user exists
        const existingUser = await firebaseDataService.user.getUserByEmail(email);
        let user;
        
        if (existingUser) {
          // User exists, update their profile data
          logger.info('User exists, updating profile data', { userId: existingUser.id, name: pseudo }, 'CreateProfileScreen');
          user = await firebaseDataService.user.updateUser(existingUser.id, {
            name: pseudo,
            avatar: avatar || existingUser.avatar,
            hasCompletedOnboarding: true
          });
        } else {
          // User doesn't exist, create new user
          logger.info('User does not exist, creating new user', { email, name: pseudo }, 'CreateProfileScreen');
          user = await firebaseDataService.user.createUser({
            ...userData,
            hasCompletedOnboarding: true
          });
        }
        
        if (!user) {
          throw new Error('Failed to create/update user');
        }

        logger.info('User created/updated successfully', { user }, 'CreateProfileScreen');

        // Upload avatar if provided and update user record
        let finalAvatarUrl = user.avatar;
        if (avatar && avatar.startsWith('file://')) {
          logger.info('Uploading avatar', null, 'CreateProfileScreen');
          const uploadResult = await AvatarUploadFallbackService.uploadAvatarWithFallback(
            user.id.toString(), 
            avatar
          );
          
          if (uploadResult.success && uploadResult.avatarUrl) {
            finalAvatarUrl = uploadResult.avatarUrl;
            logger.info('Avatar uploaded successfully', { avatarUrl: finalAvatarUrl }, 'CreateProfileScreen');
            
            // Check if fallback was used
            if (uploadResult.isFallback) {
              logger.info('Avatar uploaded with fallback (local storage)', null, 'CreateProfileScreen');
              // Show a gentle warning that it's stored locally
              Alert.alert(
                'Avatar Added', 
                'Your avatar has been added and is stored locally. It will be uploaded to cloud storage when possible.',
                [{ text: 'OK' }]
              );
            } else {
              logger.info('Avatar uploaded successfully to Firebase', null, 'CreateProfileScreen');
            }
            
            // Update user record with the uploaded avatar URL
            try {
              await firebaseDataService.user.updateUser(user.id, {
                avatar: finalAvatarUrl
              });
              logger.info('User avatar URL updated in database', { userId: user.id, avatarUrl: finalAvatarUrl }, 'CreateProfileScreen');
            } catch (updateError) {
              console.warn('⚠️ Failed to update user avatar URL in database:', updateError);
              // Continue anyway - the avatar is uploaded, just not reflected in the user record
            }
          } else {
            Alert.alert('Error', uploadResult.error || 'Failed to upload avatar');
            // Continue with profile creation even if avatar upload fails
          }
        }

        // Build user object for local state
        const appUser = {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          avatar: finalAvatarUrl || DEFAULT_AVATAR_URL,
          walletAddress: user.wallet_address,
          wallet_address: user.wallet_address,
          wallet_public_key: user.wallet_public_key,
          created_at: user.created_at,
          hasCompletedOnboarding: true // User has completed profile creation
        };

        logger.info('Final user data for authentication', { 
          userId: appUser.id, 
          name: appUser.name, 
          email: appUser.email, 
          avatar: appUser.avatar,
          hasCompletedOnboarding: appUser.hasCompletedOnboarding 
        }, 'CreateProfileScreen');

        authenticateUser(appUser, 'email');
        
        // Verify data was saved correctly
        try {
          const savedUser = await firebaseDataService.user.getCurrentUser(user.id);
          logger.info('Verification: User data saved successfully', { 
            userId: savedUser.id,
            name: savedUser.name,
            avatar: savedUser.avatar,
            hasCompletedOnboarding: savedUser.hasCompletedOnboarding
          }, 'CreateProfileScreen');
        } catch (verifyError) {
          console.warn('⚠️ Could not verify saved user data:', verifyError);
          // Continue anyway - the user is authenticated
        }
        
        try {
          (navigation as any).replace('Dashboard');
        } catch (e) {
          console.error('Navigation error:', e);
          Alert.alert('Navigation Error', 'Navigation error: ' + (e as any).message);
        }
      } catch (createError) {
        console.error('Error creating user:', createError);
        Alert.alert('Error', (createError as any).message || 'Failed to create user account');
      }
    } catch (e) {
      console.error('Error in handleNext:', e);
      Alert.alert('Error', 'Error: ' + (e as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container style={{ backgroundColor: colors.black }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <View style={[styles.mainContainer, { backgroundColor: colors.black }]}>
          {/* Header with Logo */}
          <Header variant="logoOnly" />

          {/* Main Content - Scrollable */}
          <ScrollView 
            style={[styles.scrollContent, { backgroundColor: colors.black }]}
            contentContainerStyle={[styles.scrollContentContainer, { backgroundColor: colors.black }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.centerContent, { backgroundColor: colors.black }]}>
              <Text style={[styles.title, { color: colors.white, fontSize: 24, fontWeight: 'bold' }]}>Create Your Profile</Text>
              <Text style={[styles.subtitle, { color: colors.white70, fontSize: 16, paddingHorizontal: spacing.lg }]}>
                You can always edit it later.
              </Text>
              

              {/* Profile Picture */}
              <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <PhosphorIcon name="Camera" size={48} color={colors.white70} />
                  </View>
                )}
                {avatar && (
                  <View style={styles.cameraIconContainer}>
                    <PhosphorIcon name="Pencil" size={16} color={colors.black} weight="fill" />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Pseudo Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Pseudo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your pseudo"
                  placeholderTextColor={colors.white50}
                  value={pseudo}
                  onChangeText={(text) => {
                    setPseudo(text);
                    setError(''); // Clear error when user types
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </View>
          </ScrollView>

          {/* Next Button - Fixed at bottom */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              disabled={!pseudo || isLoading}
            >
              <LinearGradient
                colors={(!pseudo || isLoading) ? [colors.white10, colors.white10] : [colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.nextButtonText}>Next</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Help Link - Fixed at bottom */}
          <View style={styles.helpSection}>
            <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
              <Text style={styles.helpText}>Need help?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default CreateProfileScreen; 