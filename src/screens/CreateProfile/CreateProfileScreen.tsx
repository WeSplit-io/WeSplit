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
  Modal,
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
import { Container, Input, Button } from '../../components/shared';
import Header from '../../components/shared/Header';
import PhosphorIcon from '../../components/shared/PhosphorIcon';

const CreateProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState<boolean | null>(null);
  const [referralInput, setReferralInput] = useState('');
  const [referralValidation, setReferralValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error?: string;
  }>({ isValidating: false, isValid: null });
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { authenticateUser, state } = useApp();

  // Validate referral code with debouncing
  const validateReferralCode = React.useCallback(async (code: string) => {
    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Reset validation if code is empty
    if (!code || code.trim().length === 0) {
      setReferralValidation({ isValidating: false, isValid: null });
      return;
    }

    // Minimum length check
    if (code.length < 8) {
      setReferralValidation({
        isValidating: false,
        isValid: false,
        error: 'Referral code must be at least 8 characters'
      });
      return;
    }

    // Set validating state
    setReferralValidation({ isValidating: true, isValid: null });

    // Debounce validation (wait 500ms after user stops typing)
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const { referralService } = await import('../../services/rewards/referralService');
        // Check if referral code exists by trying to find the referrer
        const referrer = await referralService.findReferrerByCode(code);
        
        if (referrer) {
          setReferralValidation({
            isValidating: false,
            isValid: true,
            error: undefined
          });
        } else {
          setReferralValidation({
            isValidating: false,
            isValid: false,
            error: 'Referral code not found. Please check and try again.'
          });
        }
      } catch (error) {
        logger.error('Error validating referral code', error, 'CreateProfileScreen');
        setReferralValidation({
          isValidating: false,
          isValid: null,
          error: 'Unable to validate code. Please try again.'
        });
      }
    }, 500);
  }, []);

  // Initialize referral code from route params if provided (e.g., from deep link)
  useEffect(() => {
    const params = route.params as any;
    if (params?.referralCode) {
      const code = String(params.referralCode).toUpperCase().replace(/\s/g, '');
      setReferralCode(code);
      setReferralInput(code); // Pre-fill the input if code comes from route
      // Validate the pre-filled code
      validateReferralCode(code);
      logger.info('Referral code loaded from route params', { referralCode: code }, 'CreateProfileScreen');
    }
  }, [route.params, validateReferralCode]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Debug logging (only in dev mode)
  useEffect(() => {
    if (__DEV__) {
      logger.debug('CreateProfileScreen mounted', { 
        hasReferralCode: !!referralCode,
        routeParams: route.params 
      }, 'CreateProfileScreen');
    }
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

  const handleNext = () => {
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
    // Show referral modal instead of proceeding directly
    setShowReferralModal(true);
    setHasReferralCode(null);
    // Reset validation state
    setReferralValidation({ isValidating: false, isValid: null });
    // Preserve referral code if it was pre-filled from route params
    if (!referralInput && referralCode) {
      setReferralInput(referralCode);
      // Validate if code exists
      if (referralCode.length >= 8) {
        validateReferralCode(referralCode);
      }
    }
  };

  const handleReferralChoice = (hasCode: boolean) => {
    setHasReferralCode(hasCode);
    if (!hasCode) {
      // User doesn't have a referral code, proceed with profile creation
      setShowReferralModal(false);
      createProfile('');
    }
  };

  const handleReferralSubmit = () => {
    const trimmedCode = referralInput.trim().toUpperCase().replace(/\s/g, '');
    
    // Validate before submitting
    if (!trimmedCode || trimmedCode.length < 8) {
      setReferralValidation({
        isValidating: false,
        isValid: false,
        error: 'Please enter a valid referral code'
      });
      return;
    }

    // If validation hasn't completed yet, wait for it
    if (referralValidation.isValidating) {
      // Wait a bit for validation to complete
      setTimeout(() => {
        if (referralValidation.isValid === true) {
          setShowReferralModal(false);
          createProfile(trimmedCode);
        } else {
          setReferralValidation({
            isValidating: false,
            isValid: false,
            error: 'Please verify the referral code is correct'
          });
        }
      }, 600);
      return;
    }

    // If code is invalid, don't proceed
    if (referralValidation.isValid === false) {
      setReferralValidation({
        isValidating: false,
        isValid: false,
        error: 'Please enter a valid referral code before continuing'
      });
      return;
    }

    // Proceed with profile creation
    setShowReferralModal(false);
    createProfile(trimmedCode);
  };

  const handleSkipReferral = () => {
    setShowReferralModal(false);
    createProfile('');
  };

  const createProfile = async (finalReferralCode: string) => {
    try {
      setIsLoading(true);

      // Get email from route/params, authenticated user, or stored email
      // IMPORTANT: Don't use fallback 'user@example.com' - if no email, we should handle it properly
      let email = (route?.params as any)?.email || state.currentUser?.email;
      
      // If still no email, try loading from SecureStore
      if (!email) {
        try {
          const { EmailPersistenceService } = await import('../../services/core/emailPersistenceService');
          email = await EmailPersistenceService.loadEmail();
        } catch (error) {
          logger.warn('Failed to load email from SecureStore', error, 'CreateProfileScreen');
        }
      }
      
      // If still no email, this is an error condition - user should have an email
      if (!email) {
        logger.error('No email available for profile creation', null, 'CreateProfileScreen');
        Alert.alert('Error', 'Email address is required. Please log in again.');
        return;
      }

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
          // Note: wallet_address is required by User type, but may not exist during onboarding
          // We'll use an empty string as placeholder - wallet will be created later
          logger.info('User does not exist, creating new user', { email, name: pseudo }, 'CreateProfileScreen');
          user = await firebaseDataService.user.createUser({
            email,
            name: pseudo,
            wallet_address: '', // Placeholder - will be set when wallet is created
            avatar: avatar || undefined,
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
        
        // Sync onboarding and profile image quests after user is authenticated
        try {
          const { userActionSyncService } = await import('../../services/rewards/userActionSyncService');
          // DISABLED: Legacy quest completion (complete_onboarding, profile_image)
          // These quests have been replaced by the new season-based quest system
          // Database flags are still updated via setup_account_pp quest
          // await userActionSyncService.syncOnboardingCompletion(appUser.id, true);
          
          // if (finalAvatarUrl && finalAvatarUrl !== DEFAULT_AVATAR_URL) {
          //   await userActionSyncService.syncProfileImage(appUser.id, finalAvatarUrl);
          // }
        } catch (syncError) {
          logger.error('Failed to sync quests after profile creation', { userId: appUser.id, syncError }, 'CreateProfileScreen');
          // Don't fail profile creation if sync fails
        }

        // Track referral if referral code was provided (non-blocking)
        if (finalReferralCode && finalReferralCode.trim()) {
          (async () => {
            try {
              const { referralService } = await import('../../services/rewards/referralService');
              const trimmedCode = finalReferralCode.trim().toUpperCase();
              
              logger.info('Tracking referral', { userId: appUser.id, referralCode: trimmedCode }, 'CreateProfileScreen');
              
              const result = await referralService.trackReferral(appUser.id, trimmedCode);
              
              if (result.success) {
                logger.info('Referral tracked successfully', { 
                  userId: appUser.id, 
                  referrerId: result.referrerId 
                }, 'CreateProfileScreen');
              } else {
                logger.warn('Referral tracking failed', { 
                  userId: appUser.id, 
                  referralCode: trimmedCode,
                  error: result.error 
                }, 'CreateProfileScreen');
                // Don't show error to user - referral is optional
              }
            } catch (referralError) {
              logger.error('Error tracking referral', { 
                userId: appUser.id, 
                referralCode: finalReferralCode.trim(),
                error: referralError 
              }, 'CreateProfileScreen');
              // Don't fail account creation if referral tracking fails
            }
          })().catch(() => {}); // Swallow errors - non-blocking
        }
        
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
              <Input
                containerStyle={styles.fullWidthInput}
                label="Pseudo *"
                  placeholder="Enter your pseudo"
                  value={pseudo}
                  onChangeText={(text) => {
                    setPseudo(text);
                    setError(''); // Clear error when user types
                  }}
                error={error || undefined}
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={{ width: '100%' }}
                />
              </View>
            </View>
          </ScrollView>

          {/* Next Button - Fixed at bottom */}
          <View style={styles.buttonContainer}>
            <Button
              title="Next"
              onPress={handleNext}
              variant="primary"
              disabled={!pseudo || isLoading}
              loading={isLoading}
              fullWidth={true}
            />
          </View>

          {/* Help Link - Fixed at bottom */}
          <View style={styles.helpSection}>
            <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
              <Text style={styles.helpText}>Need help?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Referral Code Modal */}
      <Modal
        visible={showReferralModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReferralModal(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowReferralModal(false)}
          />
          <View style={{
            backgroundColor: colors.blackWhite5,
            borderTopLeftRadius: spacing.lg,
            borderTopRightRadius: spacing.lg,
            padding: spacing.lg,
            paddingBottom: 40,
            maxHeight: '80%',
          }}>
            {/* Handle bar */}
            <View style={{
              alignSelf: 'center',
              width: 50,
              height: 4,
              backgroundColor: colors.white50,
              borderRadius: 2,
              marginBottom: spacing.lg,
            }} />

            {hasReferralCode === null ? (
              // Initial question
              <>
                <Text style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: colors.white,
                  textAlign: 'center',
                  marginBottom: spacing.md,
                }}>
                  Do you have a referral code?
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: colors.white70,
                  textAlign: 'center',
                  marginBottom: spacing.xl,
                }}>
                  Enter a referral code to earn bonus points for you and your friend!
                </Text>
                <View style={{ gap: spacing.md }}>
                  <Button
                    title="Yes, I have a code"
                    onPress={() => handleReferralChoice(true)}
                    variant="primary"
                    fullWidth={true}
                  />
                  <Button
                    title="No, skip"
                    onPress={() => handleReferralChoice(false)}
                    variant="secondary"
                    fullWidth={true}
                  />
                </View>
              </>
            ) : (
              // Referral code input
              <>
                <Text style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: colors.white,
                  textAlign: 'center',
                  marginBottom: spacing.md,
                }}>
                  Enter Referral Code
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: colors.white70,
                  textAlign: 'center',
                  marginBottom: spacing.xl,
                }}>
                  Paste your referral code below
                </Text>
                <View style={{ marginBottom: spacing.lg }}>
                  <Input
                    label=""
                    placeholder="Enter referral code"
                    value={referralInput}
                    onChangeText={(text) => {
                      // Auto-uppercase and remove spaces
                      const cleaned = text.toUpperCase().replace(/\s/g, '');
                      setReferralInput(cleaned);
                      // Validate as user types (with debouncing)
                      validateReferralCode(cleaned);
                    }}
                    leftIcon="Handshake"
                    rightIcon={
                      referralValidation.isValidating
                        ? undefined
                        : referralValidation.isValid === true
                        ? "CheckCircle"
                        : referralValidation.isValid === false
                        ? "XCircle"
                        : undefined
                    }
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={12}
                    error={referralValidation.error}
                    containerStyle={{ width: '100%' }}
                  />
                  {referralValidation.isValidating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <ActivityIndicator size="small" color={colors.white50} />
                      <Text style={{ 
                        color: colors.white50, 
                        fontSize: 14, 
                        marginLeft: spacing.sm 
                      }}>
                        Validating code...
                      </Text>
                    </View>
                  )}
                  {referralValidation.isValid === true && !referralValidation.isValidating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <PhosphorIcon name="CheckCircle" size={16} color={colors.green} weight="fill" />
                      <Text style={{ 
                        color: colors.green, 
                        fontSize: 14, 
                        marginLeft: spacing.sm 
                      }}>
                        Valid referral code
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ gap: spacing.md }}>
                  <Button
                    title="Continue"
                    onPress={handleReferralSubmit}
                    variant="primary"
                    fullWidth={true}
                    disabled={
                      !referralInput.trim() || 
                      referralValidation.isValidating || 
                      referralValidation.isValid === false
                    }
                  />
                  <Button
                    title="Skip"
                    onPress={handleSkipReferral}
                    variant="secondary"
                    fullWidth={true}
                  />
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Container>
  );
};

export default CreateProfileScreen; 