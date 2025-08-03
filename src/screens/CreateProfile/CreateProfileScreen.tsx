import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { unifiedUserService } from '../../services/unifiedUserService';
import { userWalletService } from '../../services/userWalletService';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { colors } from '../../theme';
import { solanaAppKitService } from '../../services/solanaAppKitService';
import * as ImagePicker from 'expo-image-picker';

const CreateProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateUser, state } = useApp();

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
      console.log('Next pressed');
      if (!pseudo) {
        setError('Pseudo is required');
        return;
      }
      
      setError('');
      setIsLoading(true);

      // Get email from route/context or authenticated user
      const email = (route?.params as any)?.email || state.currentUser?.email || 'user@example.com';

      // Create or get user using unified service
      try {
        const userData = {
          email,
          name: pseudo,
          avatar: avatar || undefined,
        };

        console.log('Creating/getting user with unified service:', { email, name: pseudo });
        const result = await unifiedUserService.createOrGetUser(userData);
        
        if (!result.success || !result.user) {
          throw new Error(result.error || 'Failed to create user');
        }

        console.log('User created/retrieved successfully:', result.user);

        // Build user object for local state
        const user = {
          id: result.user.id.toString(),
          name: result.user.name,
          email: result.user.email,
          avatar: avatar || 'https://randomuser.me/api/portraits/men/32.jpg',
          walletAddress: result.user.wallet_address,
          wallet_address: result.user.wallet_address,
          wallet_public_key: result.user.wallet_public_key,
          created_at: result.user.created_at,
          hasCompletedOnboarding: false // New users start with onboarding incomplete
        };

        authenticateUser(user, 'email');
        
        try {
          (navigation as any).replace('Onboarding');
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
    <SafeAreaView style={styles.container}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image source={require('../../../assets/WeSplitLogoName.png')} style={styles.logo} />
        </View>

      {/* Main Content */}
      <View style={styles.centerContent}>
        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>
          Create your initial profile to get started, you can always edit it later.
        </Text>

        {/* Profile Picture */}
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Image source={require('../../../assets/user.png')} style={styles.avatarIcon} />
            </View>
          )}
          <View style={styles.cameraIconContainer}>
            <Image source={require('../../../assets/modify-icon-white.png')} style={styles.cameraIcon} />
          </View>
        </TouchableOpacity>
        
        {/* Pseudo Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Pseudo*</Text>
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

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.nextButton, (!pseudo || isLoading) && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!pseudo || isLoading}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Help Link */}
      <View style={styles.helpSection}>
        <TouchableOpacity>
        <Text style={styles.helpText}>Need help?</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CreateProfileScreen; 