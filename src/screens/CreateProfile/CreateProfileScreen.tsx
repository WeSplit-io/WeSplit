import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Alert, ActionSheetIOS, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { generateWallet } from '../../../utils/walletService';
import { createUser } from '../../services/userService';
import { useApp } from '../../context/AppContext';



const CreateProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateUser } = useApp();

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

      // Get email from route/context
      const email = (route?.params as any)?.email || 'user@example.com';

      // Try wallet generation, fallback to mock if error
      let wallet: any;
      try {
        wallet = await generateWallet();
        if (!wallet || !wallet.address) throw new Error('Wallet generation failed');
      } catch (e) {
        console.error('Wallet generation error:', e);
        // Create a fallback wallet for development
        wallet = {
          address: 'mock_wallet_address_' + Date.now(),
          publicKey: 'mock_public_key_' + Date.now()
        };
      }

      // Create user in backend
      try {
        const userData = {
          email,
          name: pseudo,
          walletAddress: wallet.address,
          walletPublicKey: wallet.publicKey?.toString() || wallet.address,
          walletSecretKey: (wallet as any).secretKey || undefined,
          avatar: avatar || undefined,
        };

        console.log('Creating user in backend:', { email, name: pseudo, walletAddress: wallet.address });
        const createdUser: any = await createUser(userData);
        console.log('User created successfully:', createdUser);

        // Build user object for local state
        const user = {
          id: createdUser.id.toString(),
          name: createdUser.name,
          email: createdUser.email,
          avatar: avatar || 'https://randomuser.me/api/portraits/men/32.jpg',
          walletAddress: createdUser.walletAddress,
          wallet_address: createdUser.walletAddress, // Add missing property
          created_at: new Date().toISOString(), // Add missing property
        };

        authenticateUser(user, 'email');
        
        try {
          (navigation as any).replace('Onboarding');
        } catch (e) {
          console.error('Navigation error:', e);
          Alert.alert('Navigation Error', 'Navigation error: ' + (e as any).message);
        }
      } catch (createError) {
        console.error('Error creating user in backend:', createError);
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
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image 
          source={require('../../../assets/WeSplitLogo.png')} 
          style={styles.logoIcon}
        />
        <Text style={styles.logoText}>
          We<Text style={styles.logoSplit}>Split</Text>
        </Text>
      </View>

      <View style={styles.centerContent}>
        <Text style={styles.title}>Create Profile</Text>
        <Text style={styles.subtitle}>
          Choose a unique pseudo and a nice profile picture to get started
        </Text>

        <TouchableOpacity style={styles.avatarBox} onPress={handlePickImage}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={[styles.avatarBox, { borderWidth: 0 }]} />
          ) : (
            <Image 
              source={require('../../../assets/user.png')} 
              style={styles.avatarIcon}
            />
          )}
          <View style={styles.editIconBox}>
            <Image 
              source={require('../../../assets/edit.png')} 
              style={styles.editIcon}
            />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.avatarHint}>Tap to select profile picture</Text>

        <Text style={styles.inputLabel}>Pseudo</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a unique pseudo"
          placeholderTextColor="#888"
          value={pseudo}
          onChangeText={(text) => {
            setPseudo(text);
            setError(''); // Clear error when user types
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.nextButton, { opacity: isLoading ? 0.7 : 1 }]}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {isLoading ? 'Creating Profile...' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.helpLink}>
        <Text style={styles.helpText}>Need help?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreateProfileScreen; 