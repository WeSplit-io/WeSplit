import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  Image 
} from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import styles from './styles';

const AccountSettingsScreen = ({ navigation }: any) => {
  const { state, updateUser } = useApp();
  const { currentUser } = state;
  
  // Form states
  const [pseudo, setPseudo] = useState(currentUser?.name || 'PauluneMoon');
  const [email, setEmail] = useState(currentUser?.email || 'pauline.milaalonso@gmail.com');
  const [pseudoError, setPseudoError] = useState('Pseudo is already taken');

  const handleSaveProfile = () => {
    if (!pseudo.trim()) {
      Alert.alert('Error', 'Pseudo cannot be empty');
      return;
    }
    
    // Update user profile
    updateUser({ ...currentUser, name: pseudo.trim() });
    Alert.alert('Success', 'Profile updated successfully');
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account info</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture}>
            <Image 
              source={require('../../../assets/user.png')} 
              style={styles.profileImage}
            />
          </View>
          <TouchableOpacity style={styles.editPictureButton}>
            <Icon name="edit-2" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Pseudo Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pseudo*</Text>
          <TextInput
            style={[styles.input, pseudoError ? styles.inputError : null]}
            value={pseudo}
            onChangeText={(text) => {
              setPseudo(text);
              if (text === 'PauluneMoon') {
                setPseudoError('Pseudo is already taken');
              } else {
                setPseudoError('');
              }
            }}
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

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountSettingsScreen; 