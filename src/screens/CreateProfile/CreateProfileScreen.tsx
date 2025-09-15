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
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { unifiedUserService } from '../../services/unifiedUserService';
import { userWalletService } from '../../services/userWalletService';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { colors } from '../../theme';
import { consolidatedWalletService } from '../../services/consolidatedWalletService';
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
      
      // Prevent multiple submissions
      if (isLoading) {
        console.log('Already processing, ignoring duplicate request');
        return;
      }
      
      setError('');
      setIsLoading(true);

      // Get email from route/context or authenticated user
      const email = (route?.params as any)?.email || state.currentUser?.email || 'user@example.com';

      // Check if user already exists and has a username
      try {
        const existingUser = await unifiedUserService.getUserByEmail(email);
        
        if (existingUser && existingUser.name && existingUser.name.trim() !== '') {
          console.log('✅ User already has username, skipping profile creation:', existingUser.name);
          
          // User already has a username, authenticate them directly
          const user = {
            id: existingUser.id.toString(),
            name: existingUser.name,
            email: existingUser.email,
            avatar: existingUser.avatar || 'https://randomuser.me/api/portraits/men/32.jpg',
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
        console.log('Could not check existing user, proceeding with profile creation');
      }

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
          hasCompletedOnboarding: true // User has completed profile creation
        };

        authenticateUser(user, 'email');
        
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FWeSplitLogoName.png?alt=media&token=f785d9b1-f4e8-4f51-abac-e17407e4a48f' }} style={styles.logo} />
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
                              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }} style={styles.avatarIcon} />
            </View>
          )}
          <View style={styles.cameraIconContainer}>
                            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmodify-icon-white.png?alt=media&token=4b1aa40d-4d81-4e40-9d3b-9638bc589e21' }} style={styles.cameraIcon} />
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
            <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
              <Text style={styles.helpText}>Need help?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateProfileScreen; 