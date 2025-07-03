import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './CreateProfileScreen.styles';
import { generateWallet } from '../../utils/walletService';
import { createUser } from '../services/userService';
import { useApp } from '../context/AppContext';

const MOCK_TAKEN_PSEUDOS = ['test', 'admin', 'user'];

const CreateProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [pseudo, setPseudo] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateUser } = useApp();

  const handlePickImage = () => {
    // Mock: just toggle avatar for now
    setAvatar(avatar ? null : null); // Replace with real picker later
  };

  const handleNext = async () => {
    try {
      console.log('Next pressed');
      if (!pseudo) {
        setError('Pseudo is required');
        return;
      }
      if (MOCK_TAKEN_PSEUDOS.includes(pseudo.trim().toLowerCase())) {
        setError('Pseudo is already taken');
        return;
      }
      setError('');
      setIsLoading(true);

      // Get email from route/context
      const email = (route?.params as any)?.email || 'user@example.com';

      // Try wallet generation, fallback to mock if error
      let wallet;
      try {
        wallet = await generateWallet();
        if (!wallet || !wallet.address) throw new Error('Wallet generation failed');
      } catch (e) {
        console.error('Wallet generation error:', e);
        const mockKey = 'mock_wallet_' + Date.now();
        wallet = { 
          address: mockKey,
          publicKey: mockKey, // Ensure publicKey is present
          secretKey: undefined // Ensure secretKey is present
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
        };

        console.log('Creating user in backend:', { email, name: pseudo, walletAddress: wallet.address });
        const createdUser = await createUser(userData);
        console.log('User created successfully:', createdUser);

        // Build user object for local state
        const user = {
          id: createdUser.id.toString(),
          name: createdUser.name,
          email: createdUser.email,
          avatar: avatar || '',
          walletAddress: createdUser.walletAddress,
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
      {/* Logo row at top */}
      <View style={styles.logoRow}>
        <Image source={require('../../assets/WeSplitLogo.png')} style={styles.logoIcon} />
        <Text style={styles.logoText}>
          We<Text style={styles.logoSplit}>Split</Text>
        </Text>
      </View>
      {/* Centered content */}
      <View style={styles.centerContent}>
        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>Create your initial profile to get started, you can always edit it later.</Text>
        <View style={styles.avatarBox}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarIcon} />
          ) : (
            <Image source={require('../../assets/user.png')} style={styles.avatarIcon} />
          )}
          <TouchableOpacity style={styles.editIconBox} onPress={handlePickImage}>
            <Image source={require('../../assets/edit.png')} style={styles.editIcon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.inputLabel}>Pseudo*</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your pseudo"
          placeholderTextColor={GRAY}
          value={pseudo}
          onChangeText={text => {
            setPseudo(text);
            setError('');
          }}
          editable={!isLoading}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity 
          style={[styles.nextButton, isLoading && { opacity: 0.6 }]} 
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {isLoading ? 'Creating...' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
      {/* Help link at bottom */}
      <TouchableOpacity style={styles.helpLink}>
        <Text style={styles.helpText}>Need help ?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreateProfileScreen; 