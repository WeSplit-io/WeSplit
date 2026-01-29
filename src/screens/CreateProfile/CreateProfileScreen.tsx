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
  Keyboard,
  TextStyle,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/data';
// ✅ OPTIMIZATION: Removed unused walletService import to reduce bundle size
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { colors, spacing } from '../../theme';
import { AvatarUploadFallbackService } from '../../services/core/avatarUploadFallbackService';
import { DEFAULT_AVATAR_URL } from '../../config/constants/constants';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../../services/analytics/loggingService';
import { Container, Input, Button, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { typography } from '../../theme';
import { normalizeReferralCode, REFERRAL_CODE_MIN_LENGTH, REFERRAL_CODE_MAX_LENGTH } from '../../services/shared/referralUtils';
import { auth } from '../../config/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const CreateProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [referralInput, setReferralInput] = useState('');
  const [referralValidation, setReferralValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error?: string;
  }>({ isValidating: false, isValid: null });
  const [usernameValidation, setUsernameValidation] = useState<{
    isValidating: boolean;
    isAvailable: boolean | null;
    error?: string;
  }>({ isValidating: false, isAvailable: null });
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const referralValidationRef = useRef(referralValidation);
  const scrollViewRef = useRef<ScrollView>(null);
  const displayNameInputRef = useRef<View | null>(null);
  const referralInputRef = useRef<View | null>(null);
  const { authenticateUser, state } = useApp();

  // Keep ref in sync with state
  useEffect(() => {
    referralValidationRef.current = referralValidation;
  }, [referralValidation]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
    if (code.length < REFERRAL_CODE_MIN_LENGTH) {
      setReferralValidation({
        isValidating: false,
        isValid: false,
        error: `Referral code must be at least ${REFERRAL_CODE_MIN_LENGTH} characters`
      });
      return;
    }

    // Set validating state
    setReferralValidation({ isValidating: true, isValid: null });

    // Debounce validation (wait 500ms after user stops typing)
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        // Wait for Firebase Auth to be ready (may take time after custom token sign-in)
        // Check both app state and Firebase Auth state
        let currentUserId = state.currentUser?.id;
        let authReady = !!auth?.currentUser;

        // If Firebase Auth isn't ready but we have app state user, wait a bit for auth to sync
        if (!authReady && currentUserId) {
          logger.debug('Waiting for Firebase Auth to sync after custom token sign-in', {
            userId: currentUserId
          }, 'CreateProfileScreen');
          
          // Wait up to 2 seconds for auth state to sync
          const maxWait = 2000;
          const startTime = Date.now();
          while (!authReady && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
            authReady = !!auth?.currentUser;
            if (authReady) {
              currentUserId = auth.currentUser.uid;
              break;
            }
          }
        }

        // Use Firebase Auth UID if available, otherwise fall back to app state
        if (auth?.currentUser?.uid) {
          currentUserId = auth.currentUser.uid;
        }

        // If still no user ID, we can't validate (but this should be rare)
        if (!currentUserId) {
          logger.warn('Cannot validate referral code: no user ID available', {
            hasAppStateUser: !!state.currentUser?.id,
            hasAuthUser: !!auth?.currentUser
          }, 'CreateProfileScreen');
          setReferralValidation({
            isValidating: false,
            isValid: null,
            error: 'Please wait for authentication to complete'
          });
          return;
        }

        const { referralService } = await import('../../services/rewards/referralService');
        // Pass original code to service - it will handle normalization and case variations
        // This allows the service to try multiple case variations if normalized query fails
        const validation = await referralService.validateReferralCode(code, currentUserId);
        
        if (validation.exists) {
          setReferralValidation({
            isValidating: false,
            isValid: true,
            error: undefined
          });
        } else {
          setReferralValidation({
            isValidating: false,
            isValid: false,
            error: validation.error || 'Referral code not found. Please check and try again.'
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

  // Validate username availability with debouncing
  const validateUsername = React.useCallback(async (username: string) => {
    // Clear previous timeout
    if (usernameValidationTimeoutRef.current) {
      clearTimeout(usernameValidationTimeoutRef.current);
    }

    // Reset validation if username is empty
    if (!username || username.trim().length === 0) {
      setUsernameValidation({ isValidating: false, isAvailable: null });
      return;
    }

    const trimmedUsername = username.trim();

    // Basic validation
    if (trimmedUsername.length < 2) {
      setUsernameValidation({
        isValidating: false,
        isAvailable: false,
        error: 'Username must be at least 2 characters'
      });
      return;
    }

    if (trimmedUsername.length > 30) {
      setUsernameValidation({
        isValidating: false,
        isAvailable: false,
        error: 'Username must be 30 characters or less'
      });
      return;
    }

    // Set validating state
    setUsernameValidation({ isValidating: true, isAvailable: null });

    // Debounce validation (wait 500ms after user stops typing)
    usernameValidationTimeoutRef.current = setTimeout(async () => {
      try {
        // Get current user ID to exclude from check (if updating own username)
        const currentUserId = state.currentUser?.id || auth?.currentUser?.uid;

        // Use firebaseDataService which has fallback logic
        const result = await firebaseDataService.user.checkUsernameAvailability(trimmedUsername, currentUserId);
        
        setUsernameValidation({
          isValidating: false,
          isAvailable: result.available,
          error: result.error
        });
      } catch (error) {
        logger.error('Error validating username', error, 'CreateProfileScreen');
        // On error, allow user to proceed (validation will happen on backend during creation)
        setUsernameValidation({
          isValidating: false,
          isAvailable: null, // Unknown state - don't block user
          error: undefined // Don't show error, allow user to try
        });
      }
    }, 500);
  }, [state.currentUser?.id]);

  // Initialize referral code from route params if provided (e.g., from deep link)
  useEffect(() => {
    const params = route.params as any;
    if (params?.referralCode) {
      const code = String(params.referralCode).toUpperCase().replace(/\s/g, '');
      setReferralCode(code);
      setReferralInput(code); // Pre-fill the input if code comes from route
      
      // Wait for auth to be ready before validating (critical for Firestore access)
      const validateWhenReady = async () => {
        // Wait for auth state to be ready
        if (!auth?.currentUser) {
          logger.debug('Waiting for auth state before validating referral code from route params', null, 'CreateProfileScreen');
          
          const authReady = await new Promise<boolean>((resolve) => {
            if (!auth) {
              resolve(false);
              return;
            }
            
            if (auth.currentUser) {
              resolve(true);
              return;
            }
            
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              unsubscribe();
              resolve(!!user);
            });
            
            setTimeout(() => {
              unsubscribe();
              resolve(!!auth.currentUser);
            }, 3000);
          });
          
          if (!authReady) {
            logger.warn('Auth not ready, skipping referral code validation on mount', null, 'CreateProfileScreen');
            // Don't validate yet - user can validate manually when they're ready
            return;
          }
        }
        
        // Auth is ready, validate the code
        logger.info('Auth ready, validating referral code from route params', { referralCode: code }, 'CreateProfileScreen');
        validateReferralCode(code);
      };
      
      validateWhenReady().catch((error) => {
        logger.error('Error validating referral code on mount', error, 'CreateProfileScreen');
      });
      
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

  // Debug logging and auth state check (only in dev mode)
  useEffect(() => {
    if (__DEV__) {
      logger.debug('CreateProfileScreen mounted', { 
        hasReferralCode: !!referralCode,
        routeParams: route.params,
        isAuthenticated: !!auth?.currentUser,
        currentUserId: auth?.currentUser?.uid,
        appStateUserId: state.currentUser?.id
      }, 'CreateProfileScreen');
    }
    
    // Verify auth state is ready on mount
    if (!auth?.currentUser && state.currentUser?.id) {
      logger.warn('CreateProfileScreen: User in app state but not in Firebase Auth', {
        appStateUserId: state.currentUser.id
      }, 'CreateProfileScreen');
      
      // Try to wait for auth state
      const checkAuth = async () => {
        const authReady = await new Promise<boolean>((resolve) => {
          if (!auth) {
            resolve(false);
            return;
          }
          
          if (auth.currentUser) {
            resolve(true);
            return;
          }
          
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(!!user);
          });
          
          setTimeout(() => {
            unsubscribe();
            resolve(!!auth.currentUser);
          }, 2000);
        });
        
        if (authReady) {
          logger.info('Auth state synced after mount', {
            userId: auth.currentUser?.uid
          }, 'CreateProfileScreen');
        } else {
          logger.warn('Auth state not ready after mount - Firestore operations may fail', null, 'CreateProfileScreen');
        }
      };
      
      checkAuth().catch((error) => {
        logger.error('Error checking auth state on mount', error, 'CreateProfileScreen');
      });
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

  const handleNext = async () => {
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
  
    // Use referralInput if available, otherwise use referralCode from route params
    const finalReferralCode = referralInput.trim() || referralCode || '';
    
    // Validate referral code if provided
    if (finalReferralCode && finalReferralCode.length >= REFERRAL_CODE_MIN_LENGTH) {
      const normalizedCode = normalizeReferralCode(finalReferralCode);
      await validateReferralCode(normalizedCode);
      
      // Wait a bit for validation to complete
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Check validation state after waiting using ref for latest state
      if (referralValidationRef.current.isValid === false) {
        return;
      }
      
      // Use validated code (or proceed even if validation is still pending/null)
      createProfile(normalizedCode);
    } else {
      // No referral code or too short, proceed without it
      createProfile('');
    }
  };

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const createProfile = async (finalReferralCode: string) => {
    try {
      setIsLoading(true);

      // Validate username one more time before creating profile
      if (!pseudo || pseudo.trim().length < 2) {
        setError('Please enter a valid username (at least 2 characters)');
        setIsLoading(false);
        return;
      }

      // Final username availability check
      const currentUserId = state.currentUser?.id || auth?.currentUser?.uid;
      const usernameCheck = await firebaseDataService.user.checkUsernameAvailability(pseudo.trim(), currentUserId);
      
      if (!usernameCheck.available) {
        setError(usernameCheck.error || 'This username is already taken. Please choose another.');
        setUsernameValidation({
          isValidating: false,
          isAvailable: false,
          error: usernameCheck.error || 'Username is already taken'
        });
        setIsLoading(false);
        return;
      }

      // Get authentication method and required fields
      const params = route?.params as any;
      const phoneNumber = params?.phoneNumber;
      const isPhoneAuth = !!phoneNumber && !params?.email;

      // Get email from route/params, authenticated user, or stored email
      let email = (route?.params as any)?.email || state.currentUser?.email;
      
      // If still no email, try loading from SecureStore
      if (!email) {
        try {
          const { AuthPersistenceService } = await import('../../../services/core/authPersistenceService');
          email = await AuthPersistenceService.loadEmail();
        } catch (error) {
          logger.warn('Failed to load email from SecureStore', error, 'CreateProfileScreen');
        }
      }
      
      // For phone authentication, email is optional
      // For email authentication, email is required
      if (!isPhoneAuth && !email) {
        logger.error('No email available for email-based profile creation', null, 'CreateProfileScreen');
        Alert.alert('Error', 'Email address is required. Please log in again.');
        return;
      }

      logger.info('Creating profile', {
        isPhoneAuth,
        hasEmail: !!email,
        phoneNumber: phoneNumber?.substring(0, 5) + '...',
        email: email?.substring(0, 5) + '...'
      }, 'CreateProfileScreen');

      // Check if user already exists and has a username
      // Use different logic for email vs phone authentication
      let existingUser = null;

      try {
        if (isPhoneAuth) {
          // For phone authentication, check by current user ID or phone number
          if (state.currentUser?.id) {
            existingUser = await firebaseDataService.user.getCurrentUser(state.currentUser.id);
          } else if (phoneNumber) {
            // Fallback: try to find by phone number
            existingUser = await firebaseDataService.user.getUserByPhone(phoneNumber);
          }
        } else {
          // For email authentication, first check by Firebase Auth UID (catches Phantom users)
          // Then fall back to email lookup
          if (auth?.currentUser?.uid) {
            try {
              existingUser = await firebaseDataService.user.getCurrentUser(auth.currentUser.uid);
              if (existingUser) {
                logger.info('Found user by Firebase Auth UID', {
                  userId: existingUser.id,
                  hasWallet: !!existingUser.wallet_address,
                  walletType: existingUser.wallet_type
                }, 'CreateProfileScreen');
              }
            } catch (error) {
              logger.debug('User not found by Firebase Auth UID, trying email lookup', {
                uid: auth.currentUser.uid,
                error: error instanceof Error ? error.message : String(error)
              }, 'CreateProfileScreen');
            }
          }
          
          // Fallback: check by email if not found by UID
          if (!existingUser) {
            existingUser = await firebaseDataService.user.getUserByEmail(email);
          }
        }
        
        if (existingUser && existingUser.name && existingUser.name.trim() !== '') {
          logger.info('User already has username, skipping profile creation', {
            name: existingUser.name,
            authMethod: isPhoneAuth ? 'phone' : 'email'
          }, 'CreateProfileScreen');
          
          // User already has a username, authenticate them directly
          const user = {
            // Spread all Firestore data first
            ...existingUser,
            // Then override with critical fields
            id: existingUser.id.toString(),
            name: existingUser.name,
            email: existingUser.email || '',
            phone: existingUser.phone || phoneNumber || '',
            avatar: existingUser.avatar || DEFAULT_AVATAR_URL,
            walletAddress: existingUser.wallet_address,
            wallet_address: existingUser.wallet_address,
            wallet_public_key: existingUser.wallet_public_key,
            created_at: existingUser.created_at,
            hasCompletedOnboarding: true,
            // Ensure asset fields are included with proper defaults
            badges: existingUser.badges || [],
            active_badge: existingUser.active_badge || undefined,
            profile_borders: existingUser.profile_borders || [],
            active_profile_border: existingUser.active_profile_border || undefined,
            wallet_backgrounds: existingUser.wallet_backgrounds || [],
            active_wallet_background: existingUser.active_wallet_background || undefined,
          };

          authenticateUser(user, isPhoneAuth ? 'phone' : 'email');
          
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

        // CRITICAL: Ensure Firebase Auth is ready before creating user document
        // This prevents permission errors when auth state hasn't synced yet
        logger.info('Waiting for Firebase Auth state to be ready', null, 'CreateProfileScreen');
        const waitForAuth = (): Promise<boolean> => {
          if (!auth) {
            logger.error('Firebase Auth not initialized', null, 'CreateProfileScreen');
            return Promise.resolve(false);
          }
          
          if (auth.currentUser) {
            return Promise.resolve(true);
          }
          
          return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              unsubscribe();
              resolve(!!user);
            });
            
            setTimeout(() => {
              unsubscribe();
              resolve(!!auth.currentUser);
            }, 5000);
          });
        };
        
        const authReady = await waitForAuth();
        if (!authReady && !auth?.currentUser) {
          logger.error('Firebase Auth not ready after waiting', null, 'CreateProfileScreen');
          Alert.alert(
            'Authentication Error',
            'Please wait a moment and try again. If the problem persists, please sign in again.'
          );
          return;
        }
        
        // Verify that the authenticated user ID matches the app state user ID (if available)
        if (state.currentUser?.id && auth?.currentUser?.uid) {
          if (state.currentUser.id !== auth.currentUser.uid) {
            logger.warn('User ID mismatch between app state and Firebase Auth', {
              appStateId: state.currentUser.id,
              authUid: auth.currentUser.uid
            }, 'CreateProfileScreen');
            // Continue anyway - use auth.currentUser.uid as it's the source of truth for Firestore
          }
        }

        // Create or update user using unified service
      try {
        logger.info('Creating/updating user with firebase service', {
          isPhoneAuth,
          email: email?.substring(0, 5) + '...',
          phone: phoneNumber?.substring(0, 5) + '...',
          name: pseudo,
          authUid: auth?.currentUser?.uid
        }, 'CreateProfileScreen');
        
        // Handle user creation differently for email vs phone auth
        let user;
        let existingUser;

        if (isPhoneAuth) {
          // For phone authentication, check by current user ID
          if (state.currentUser?.id) {
            existingUser = await firebaseDataService.user.getCurrentUser(state.currentUser.id);
          }
        
        if (existingUser) {
          // User exists, update their profile data
            logger.info('Phone user exists, updating profile data', { userId: existingUser.id, name: pseudo }, 'CreateProfileScreen');
            user = await firebaseDataService.user.updateUser(existingUser.id, {
              name: pseudo,
              avatar: avatar || existingUser.avatar,
              phone: phoneNumber,
              hasCompletedOnboarding: true
            });
          } else {
            // Create new phone user
            logger.info('Creating new phone user', { phone: phoneNumber?.substring(0, 5) + '...', name: pseudo }, 'CreateProfileScreen');
            const newUserId = state.currentUser?.id || auth?.currentUser?.uid;
            
            if (!newUserId) {
              throw new Error('User ID is required to create a profile. Please sign in first.');
            }

            // Verify auth state matches the user ID we're trying to use
            if (auth?.currentUser?.uid && auth.currentUser.uid !== newUserId) {
              logger.warn('User ID mismatch, using Firebase Auth UID', {
                appStateId: newUserId,
                authUid: auth.currentUser.uid
              }, 'CreateProfileScreen');
              // Use auth.currentUser.uid as it's required by Firestore security rules
            }

            // Create user document using the createUser method which handles authentication properly
            user = await firebaseDataService.user.createUser({
              email: email || '',
              name: pseudo,
              phone: phoneNumber || '',
              wallet_address: '',
              wallet_public_key: '',
              avatar: avatar || DEFAULT_AVATAR_URL,
              hasCompletedOnboarding: true,
              badges: [],
              profile_borders: [],
              wallet_backgrounds: []
            });
          }
        } else {
          // For email authentication, use existing logic
          // First check if user exists
          existingUser = await firebaseDataService.user.getUserByEmail(email);

          if (existingUser) {
            // User exists, update their profile data
            // CRITICAL: Preserve existing wallet_address if user has one (e.g., Phantom wallet)
            const updateData: any = {
              name: pseudo,
              avatar: avatar || existingUser.avatar,
              hasCompletedOnboarding: true
            };
            
            // Preserve wallet info if it exists (especially for Phantom/external wallets)
            if (existingUser.wallet_address) {
              updateData.wallet_address = existingUser.wallet_address;
              updateData.wallet_public_key = existingUser.wallet_public_key || existingUser.wallet_address;
              if (existingUser.wallet_type) {
                updateData.wallet_type = existingUser.wallet_type;
              }
              if (existingUser.wallet_status) {
                updateData.wallet_status = existingUser.wallet_status;
              }
              logger.info('Preserving existing wallet address for user', {
                userId: existingUser.id,
                walletAddress: existingUser.wallet_address.substring(0, 8) + '...',
                walletType: existingUser.wallet_type
              }, 'CreateProfileScreen');
            }
            
            logger.info('Email user exists, updating profile data', { userId: existingUser.id, name: pseudo }, 'CreateProfileScreen');
            user = await firebaseDataService.user.updateUser(existingUser.id, updateData);
        } else {
          // User doesn't exist, create new user
          // Check if this is a Phantom user by checking if we have a wallet from Phantom auth
          // For Phantom users, the wallet should already be set in the user record created by PhantomAuthService
          // But if we're here, the user record wasn't found, so we'll create it
          // Note: wallet_address is required by User type, but may not exist during onboarding
          // We'll use an empty string as placeholder - wallet will be created later (unless it's a Phantom user)
          logger.info('User does not exist, creating new user', { email, name: pseudo }, 'CreateProfileScreen');
          user = await firebaseDataService.user.createUser({
            email,
            name: pseudo,
            wallet_address: '', // Placeholder - will be set when wallet is created (or preserved if Phantom)
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

        // Build user object for local state - include ALL user fields
        const appUser = {
          // Spread all Firestore data first to include asset fields
          ...user,
          // Then override with critical fields
          id: user.id.toString(),
          name: user.name,
          email: user.email || '',
          phone: user.phone || phoneNumber || '',
          avatar: finalAvatarUrl || DEFAULT_AVATAR_URL,
          walletAddress: user.wallet_address,
          wallet_address: user.wallet_address,
          wallet_public_key: user.wallet_public_key,
          created_at: user.created_at,
          hasCompletedOnboarding: true, // User has completed profile creation
          // Ensure asset fields are included with proper defaults
          badges: user.badges || [],
          active_badge: user.active_badge || undefined,
          profile_borders: user.profile_borders || [],
          active_profile_border: user.active_profile_border || undefined,
          wallet_backgrounds: user.wallet_backgrounds || [],
          active_wallet_background: user.active_wallet_background || undefined,
        };

        logger.info('Final user data for authentication', { 
          userId: appUser.id, 
          name: appUser.name, 
          email: appUser.email, 
          avatar: appUser.avatar,
          hasCompletedOnboarding: appUser.hasCompletedOnboarding 
        }, 'CreateProfileScreen');

        authenticateUser(appUser, isPhoneAuth ? 'phone' : 'email');
        
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
              // Pass original code (not pre-normalized) to allow case variation matching
              // The service will normalize internally and try case variations if needed
              logger.info('Tracking referral', { 
                userId: appUser.id, 
                referralCode: finalReferralCode,
                normalizedCode: normalizeReferralCode(finalReferralCode)
              }, 'CreateProfileScreen');
              
              // Pass original code to trackReferral - it handles normalization and case variations
              const result = await referralService.trackReferral(appUser.id, finalReferralCode);
              
              if (result.success) {
                logger.info('Referral tracked successfully', { 
                  userId: appUser.id, 
                  referrerId: result.referrerId 
                }, 'CreateProfileScreen');
              } else {
                logger.warn('Referral tracking failed', { 
                  userId: appUser.id, 
                  referralCode: finalReferralCode,
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
          })().catch((backgroundError) => {
            // Ensure background errors are logged for observability
            logger.error('Background referral tracking task failed', { 
              userId: appUser.id,
              error: backgroundError 
            }, 'CreateProfileScreen');
          }); // Still non-blocking for the user flow
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
          (navigation as any).replace('CreatePin');
        } catch (e) {
          console.error('Navigation error:', e);
          Alert.alert('Navigation Error', 'Navigation error: ' + (e as any).message);
        }
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
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        enabled={true}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          keyboardDismissMode="interactive"
          scrollEnabled={false}
        >
          <Header
            showBackButton={false}
            showHelpCenter={true}
            onHelpCenterPress={handleHelpCenterPress}
          />

          <View style={styles.contentContainer}>
            {/* Title */}
            <View style={styles.titleContainer}>
              <View style={styles.iconContainer}>
                <PhosphorIcon
                  name="UserCircleGear"
                  size={24}
                  color={colors.white}
                  weight="regular"
                />
              </View>
              <Text style={styles.title}>Create your Profile</Text>
              <Text style={styles.subtitle}>
                You can always edit it later.
              </Text>
            </View>

            {/* Profile Picture Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <PhosphorIcon name="CameraPlus" size={35} color={colors.white70} />
                  </View>
                )}
              </TouchableOpacity>
              
              {avatar && (
                <TouchableOpacity onPress={handlePickImage} style={styles.changePictureButton}>
                  <Text style={styles.changePictureText}>Change Picture</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Display Name Input */}
            <View
              style={styles.inputSection}
              ref={(ref) => {
                displayNameInputRef.current = ref;
              }}
            >
              <Input
                label="Display Name *"
                placeholder="Enter display name"
                value={pseudo}
                onChangeText={(text) => {
                  setPseudo(text);
                  setError('');
                }}
                onFocus={() => {
                  // Minimal scroll - let KeyboardAvoidingView handle most of it
                  // Only scroll if absolutely necessary
                }}
                error={error || undefined}
                autoCapitalize="words"
                autoCorrect={false}
                labelStyle={styles.inputLabel}
              />
            </View>

            {/* Referral Code Input */}
            <View
              style={styles.inputSection}
              ref={(ref) => {
                referralInputRef.current = ref;
              }}
            >
              <Input
                label="Referral Code"
                placeholder="Enter referral code"
                value={referralInput}
                onChangeText={(text) => {
                  const cleaned = text.toUpperCase().replace(/\s/g, '');
                  setReferralInput(cleaned);
                  validateReferralCode(cleaned);
                }}
                onFocus={() => {
                  // Scroll up 100px to show input above keyboard
                  setTimeout(() => {
                    const inputView = referralInputRef.current;
                    if (inputView && scrollViewRef.current) {
                      inputView.measureLayout(
                        scrollViewRef.current as any,
                        (x, y) => {
                          scrollViewRef.current?.scrollTo({
                            y: Math.max(0, y - 100),
                            animated: true,
                          });
                        },
                        () => {}
                      );
                    }
                  }, 200);
                }}
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
                maxLength={REFERRAL_CODE_MAX_LENGTH}
                error={referralValidation.error}
                labelStyle={styles.inputLabel}
              />
              {referralValidation.isValidating && (
                <View style={styles.validationContainer}>
                  <ActivityIndicator size="small" color={colors.white50} />
                  <Text style={styles.validationText}>Validating code...</Text>
                </View>
              )}
              {referralValidation.isValid === true && !referralValidation.isValidating && (
                <View style={styles.validationContainer}>
                  <PhosphorIcon name="CheckCircle" size={16} color={colors.green} weight="fill" />
                  <Text style={[styles.validationText, { color: colors.green }]}>Valid referral code</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Continue Button - Fixed at bottom of screen */}
        <View style={styles.buttonContainer}>
          <Button
            title="Continue"
            onPress={handleNext}
            variant="primary"
            size="large"
            fullWidth={true}
            disabled={!pseudo || isLoading}
            loading={isLoading}
          />
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default CreateProfileScreen; 