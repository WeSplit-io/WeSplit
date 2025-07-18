import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, SafeAreaView, Switch } from 'react-native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { styles } from './styles';

const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const { state, logoutUser } = useApp();
  const { currentUser } = state;
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              logoutUser();
              navigation.replace('AuthMethods');
            } catch (error) {
              console.error('Logout error:', error);
              logoutUser();
              navigation.replace('AuthMethods');
            }
          }
        }
      ]
    );
  };

  const handleAccountInfo = () => {
    navigation.navigate('AccountSettings');
  };

  const handleWallet = () => {
    navigation.navigate('WalletManagement');
  };

  const handleVerifyAccount = () => {
    Alert.alert('Verify Account', 'Account verification feature coming soon!');
  };

  const handleReferralFriend = () => {
    Alert.alert('Referral', 'Refer a friend feature coming soon!');
  };

  const handleHelpCenter = () => {
    Alert.alert('Help Center', 'Help center feature coming soon!');
  };

  const handleFAQ = () => {
    Alert.alert('FAQ', 'FAQ feature coming soon!');
  };

  const handleFaceIdToggle = () => {
    setFaceIdEnabled(!faceIdEnabled);
  };

  const displayName = currentUser?.name || 'PauluneMoon';
  const displayId = currentUser?.wallet_address ? `${currentUser.wallet_address.substring(0, 4)}.....${currentUser.wallet_address.substring(currentUser.wallet_address.length - 4)}` : 'B3gr.....sdgux';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Image 
              source={{ uri: currentUser?.avatar }} 
              style={styles.avatarImage}
              defaultSource={require('../../../assets/user.png')}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileId}>{displayId}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Icon name="edit-2" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Account Details Section */}
        <Text style={styles.sectionTitle}>Account details</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleAccountInfo}>
          <Icon name="file-text" size={20} color="#A5EA15" />
          <Text style={styles.menuItemText}>Account info</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleWallet}>
          <Icon name="credit-card" size={20} color="#A5EA15" />
          <Text style={styles.menuItemText}>Wallet</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleVerifyAccount}>
          <Icon name="check-circle" size={20} color="#A5EA15" />
          <Text style={styles.menuItemText}>Verify account</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>
          
        <TouchableOpacity style={styles.menuItem} onPress={handleReferralFriend}>
          <Icon name="users" size={20} color="#A5EA15" />
          <Text style={styles.menuItemText}>Referal Friend</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>

        <View style={styles.menuItem}>
          <Icon name="smartphone" size={20} color="#A5EA15" />
          <Text style={styles.menuItemText}>Set up Face ID</Text>
          <Switch
            value={faceIdEnabled}
            onValueChange={handleFaceIdToggle}
            trackColor={{ false: '#767577', true: '#A5EA15' }}
            thumbColor={faceIdEnabled ? '#212121' : '#f4f3f4'}
          />
        </View>

        {/* Help and Support Section */}
        <Text style={styles.sectionTitle}>Help and Support</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleHelpCenter}>
          <Icon name="help-circle" size={20} color="#A5EA15" />
          <Text style={styles.menuItemText}>Help Center</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleFAQ}>
          <Icon name="file-text" size={20} color="#A5EA15" />
          <Text style={styles.menuItemText}>FAQ</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { marginBottom: 0 }]} onPress={handleLogout}>
          <Icon name="log-out" size={20} color="#FF6B6B" />
          <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>
        
        {/* Extra space at bottom for NavBar */}
        <View style={{ height:150 }} />
      </ScrollView>
      
      <NavBar currentRoute="Profile" navigation={navigation} />
    </SafeAreaView>
  );
};

export default ProfileScreen; 