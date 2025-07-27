import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, SafeAreaView, Switch } from 'react-native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { styles } from './styles';

// Helper function to safely load images with fallback
const SafeImage = ({ source, style, fallbackSource }: any) => {
  const [hasError, setHasError] = useState(false);
  
  return (
    <Image
      source={hasError ? fallbackSource : source}
      style={style}
      onError={() => setHasError(true)}
    />
  );
};

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

  const handleTransactionHistory = () => {
    navigation.navigate('TransactionHistory');
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
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <TouchableOpacity style={styles.profileCard} onPress={handleAccountInfo}>
          <View style={styles.profileAvatar}>
            {currentUser?.avatar && currentUser.avatar.trim() !== '' ? (
              <Image 
                source={{ uri: currentUser.avatar }} 
                style={styles.avatarImage}
                defaultSource={require('../../../assets/user.png')}
                onError={() => {
                  // If the avatar fails to load, we could set a fallback state here
                  console.log('Failed to load avatar image');
                }}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileId}>{displayId}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Image
              source={require('../../../assets/icon-edit-white70.png')}
              style={styles.editIcon}
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Account Details Section */}
        <Text style={styles.sectionTitle}>Account details</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleAccountInfo}>
          <SafeImage 
            source={require('../../../assets/profil-account-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={styles.menuItemText}>Account info</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleWallet}>
          <SafeImage 
            source={require('../../../assets/profil-wallet-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={styles.menuItemText}>Wallet</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleTransactionHistory}>
          <SafeImage 
            source={require('../../../assets/profil-history-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={styles.menuItemText}>Transaction History</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleVerifyAccount}>
          <SafeImage 
            source={require('../../../assets/profil-verify-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={styles.menuItemText}>Verify account</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>
          
        <TouchableOpacity style={styles.menuItem} onPress={handleReferralFriend}>
          <SafeImage 
            source={require('../../../assets/profil-referal-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={styles.menuItemText}>Referral Friend</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>

        <View style={styles.menuItem}>
          <SafeImage 
            source={require('../../../assets/profil-scan-id.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
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
          <SafeImage 
            source={require('../../../assets/profil-help-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={styles.menuItemText}>Help Center</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleFAQ}>
          <SafeImage 
            source={require('../../../assets/profil-faq-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={styles.menuItemText}>FAQ</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { marginBottom: 0 }]} onPress={handleLogout}>
          <SafeImage 
            source={require('../../../assets/profil-logout-icon.png')} 
            style={styles.menuIcon}
            fallbackSource={require('../../../assets/user.png')}
          />
          <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
          <SafeImage 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.chevronIcon}
            fallbackSource={require('../../../assets/arrow-left.png')}
          />
        </TouchableOpacity>
        
        {/* Extra space at bottom for NavBar */}
        <View style={{ height:150 }} />
      </ScrollView>
      
      <NavBar currentRoute="Profile" navigation={navigation} />
    </SafeAreaView>
  );
};

export default ProfileScreen; 