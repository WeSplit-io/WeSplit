import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  Image,
  Platform,
  ActionSheetIOS,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import * as ImagePicker from 'expo-image-picker';
import styles from './styles';


const AccountSettingsScreen = ({ navigation }: any) => {
  const { state, updateUser } = useApp();
  const { currentUser } = state;
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Form states
  const [pseudo, setPseudo] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatar, setAvatar] = useState<string | null>(currentUser?.avatar || null);
  const [pseudoError, setPseudoError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleSaveProfile = () => {
    if (!pseudo.trim()) {
      Alert.alert('Error', 'Pseudo cannot be empty');
      return;
    }
    
    // Update user profile
    updateUser({ 
      ...currentUser, 
      name: pseudo.trim(),
      avatar: avatar || undefined
    });
    Alert.alert('Success', 'Profile updated successfully');
    nav.goBack();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account has been deleted successfully');
            navigation.navigate('AuthMethods');
          }
        }
      ]
    );
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Icon name="trash-2" size={20} color="#FF6B6B" />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>

          {/* Extra space for bottom padding */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      {/* Fixed Save Button at Bottom */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity 
          onPress={handleSaveProfile}
          disabled={!hasChanges}
        >
          <LinearGradient
            colors={!hasChanges ? [colors.white10, colors.white10] : [colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={[
              styles.saveButtonText,
              !hasChanges && styles.saveButtonTextDisabled
            ]}>Save</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AccountSettingsScreen; 