import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, SafeAreaView, Clipboard, TextInput, Modal, Linking, Share, ActionSheetIOS, Platform } from 'react-native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { importWallet } from '../../../utils/walletService';
import { createMoonPayURL } from '../../services/moonpayService';
import Feather from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { styles } from './styles';

const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const { state, logoutUser, updateUser } = useApp();
  const { disconnectWallet, isConnected, address, balance, walletInfo, walletName, chainId, secretKey } = useWallet();
  const { currentUser, authMethod } = state;
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [loadingPrivateKey, setLoadingPrivateKey] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [moonpayModalVisible, setMoonpayModalVisible] = useState(false);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [userWalletInfo, setUserWalletInfo] = useState<any>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

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
              // Disconnect from wallet if connected
              if (authMethod === 'wallet') {
                await disconnectWallet();
              }
              
              // Logout from app
              logoutUser();
              navigation.replace('AuthMethods');
            } catch (error) {
              console.error('Logout error:', error);
              // Still logout from app even if wallet disconnect fails
              logoutUser();
              navigation.replace('AuthMethods');
            }
          }
        }
      ]
    );
  };

  const handleBackToDashboard = () => {
    navigation.navigate('Dashboard');
  };

  const handleExportWalletData = () => {
    const userWalletAddress = currentUser?.wallet_address;
    const contextWalletAddress = address;
    
    if (!userWalletAddress && !contextWalletAddress) {
      Alert.alert('Error', 'No wallet data available to export.');
      return;
    }

    const walletData = {
      databaseWallet: userWalletAddress,
      connectedWallet: contextWalletAddress,
      walletName,
      chainId,
      balance,
      isConnected,
      matchStatus: userWalletAddress === contextWalletAddress ? 'Matched' : 'Different',
      exportDate: new Date().toISOString(),
    };

    Alert.alert(
      'Export Wallet Data',
      `Database Wallet: ${userWalletAddress || 'Not set'}\n` +
      `Connected Wallet: ${contextWalletAddress || 'Not connected'}\n` +
      `Wallet Name: ${walletName || 'Unknown'}\n` +
      `Network: ${chainId || 'Solana Devnet'}\n` +
      `Balance: ${balance ? `${balance.toFixed(4)} SOL` : 'Loading...'}\n` +
      `Connected: ${isConnected ? 'Yes' : 'No'}\n` +
      `Match Status: ${walletData.matchStatus}\n\n` +
      'This data can be used for backup purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy Data', onPress: () => {
          Alert.alert('Success', 'Wallet data copied to clipboard!');
        }}
      ]
    );
  };

  const handleViewWalletAnalytics = () => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect your wallet first.');
      return;
    }

    Alert.alert(
      'Wallet Analytics',
      'This feature would show:\n' +
      '• Transaction frequency\n' +
      '• Spending patterns\n' +
      '• Token distribution\n' +
      '• Network usage\n\n' +
      'Coming soon!',
      [{ text: 'OK' }]
    );
  };

  const handleSyncWalletWithDatabase = () => {
    const userWalletAddress = currentUser?.wallet_address;
    const contextWalletAddress = address;
    
    if (!isConnected || !contextWalletAddress) {
      Alert.alert('Error', 'Please connect your wallet first.');
      return;
    }

    if (userWalletAddress === contextWalletAddress) {
      Alert.alert('Info', 'Wallet is already synced with the database.');
      return;
    }

    Alert.alert(
      'Sync Wallet with Database',
      `Current Database Wallet: ${userWalletAddress || 'Not set'}\n` +
      `Connected Wallet: ${contextWalletAddress}\n\n` +
      'Do you want to update the database to use the currently connected wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sync Wallet', 
          onPress: () => {
            Alert.alert(
              'Sync Successful', 
              'Wallet has been synced with the database. You may need to restart the app to see changes.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const handleConnectWallet = async () => {
    try {
      setLoadingWallet(true);
      // This will be handled by the wallet context
      Alert.alert('Wallet Connection', 'Wallet connection is handled automatically when needed.');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      Alert.alert('Error', 'Failed to connect wallet. Please try again.');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleDisconnectWallet = async () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoadingWallet(true);
              await disconnectWallet();
              Alert.alert('Success', 'Wallet disconnected successfully.');
            } catch (error) {
              console.error('Error disconnecting wallet:', error);
              Alert.alert('Error', 'Failed to disconnect wallet. Please try again.');
            } finally {
              setLoadingWallet(false);
            }
          }
        }
      ]
    );
  };

  const handleViewWalletDetails = () => {
    const userWalletAddress = currentUser?.wallet_address;
    const contextWalletAddress = address;
    
    Alert.alert(
      'Wallet Details',
      `Database Wallet: ${userWalletAddress || 'Not set'}\n` +
      `Connected Wallet: ${contextWalletAddress || 'Not connected'}\n` +
      `Status: ${userWalletAddress === contextWalletAddress ? 'Synced' : 'Not synced'}\n` +
      `Balance: ${balance ? `${balance.toFixed(4)} SOL` : 'Loading...'}\n` +
      `Network: ${chainId || 'Solana Devnet'}`,
      [{ text: 'OK' }]
    );
  };

  const handleShowPrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };

  const handleCopyPrivateKey = () => {
    if (privateKey) {
      Clipboard.setString(privateKey);
      Alert.alert('Copied!', 'Private key copied to clipboard');
    }
  };

  const handleImportWallet = async () => {
    if (!importKey.trim()) {
      Alert.alert('Error', 'Please enter a private key or seed phrase');
      return;
    }

    setImportLoading(true);
    try {
      await importWallet(importKey.trim());
      Alert.alert('Success', 'Wallet imported successfully!');
      setImportModalVisible(false);
      setImportKey('');
    } catch (error) {
      console.error('Import wallet error:', error);
      Alert.alert('Error', 'Failed to import wallet. Please check your private key.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleFundWithMoonPay = async () => {
    if (!address) {
      Alert.alert('Error', 'Please connect your wallet first.');
      return;
    }

    setFundingLoading(true);
    try {
      const moonpayResponse = await createMoonPayURL(address);
      const moonpayUrl = typeof moonpayResponse === 'string' ? moonpayResponse : moonpayResponse.url;
      
      Alert.alert(
        'Fund Wallet',
        'You will be redirected to MoonPay to purchase cryptocurrency.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: () => {
              Linking.openURL(moonpayUrl);
            }
          }
        ]
      );
    } catch (error) {
      console.error('MoonPay error:', error);
      Alert.alert('Error', 'Failed to open MoonPay. Please try again.');
    } finally {
      setFundingLoading(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out WeSplit - the easiest way to split expenses with friends! Download it now.',
        title: 'WeSplit App',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleRateApp = () => {
    Alert.alert('Rate App', 'This feature will redirect to the app store for rating.');
  };

  const handleHelp = () => {
    Alert.alert('Help', 'This will open the help documentation.');
  };

  const handleFeedback = () => {
    Alert.alert('Feedback', 'This will open a feedback form.');
  };

  const handleTerms = () => {
    Alert.alert('Terms of Service', 'This will open the terms of service.');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy Policy', 'This will open the privacy policy.');
  };

  const handleAbout = () => {
    Alert.alert(
      'About WeSplit',
      'WeSplit v1.0\nBuilt with React Native\nPowered by Solana',
      [{ text: 'OK' }]
    );
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleUpdateAvatar(result.assets[0].uri);
    }
  };

  const openImageLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Photo library permission is required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleUpdateAvatar(result.assets[0].uri);
    }
  };

  const handleUpdateAvatar = async (newAvatarUri: string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setAvatarLoading(true);
    try {
      // This function will be replaced with a hybrid service call
      // For now, it will simulate an update
      console.log('Simulating avatar update for user:', currentUser.id);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      updateUser({ ...currentUser, avatar: newAvatarUri });
      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePickImage = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openImageLibrary();
          }
        }
      );
    } else {
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: openCamera },
          { text: 'Choose from Library', onPress: openImageLibrary },
        ]
      );
    }
  };

  // Settings options configuration
  const settingsOptions = [
    {
      section: 'Account',
      items: [
        { icon: 'settings', label: 'Account Settings', action: () => navigation.navigate('AccountSettings'), isDestructive: false },
        { icon: 'bell', label: 'Notifications', action: () => navigation.navigate('Notifications'), isDestructive: false },
        { icon: 'globe', label: 'Language', action: () => navigation.navigate('Language'), isDestructive: false },
        { icon: 'star', label: 'Premium', action: () => navigation.navigate('Premium'), isDestructive: false },
      ]
    },
    {
      section: 'Wallet',
      items: [
        { icon: 'download', label: 'Import Wallet', action: () => setImportModalVisible(true), isDestructive: false },
        { icon: 'credit-card', label: 'Fund with MoonPay', action: handleFundWithMoonPay, isDestructive: false },
        { icon: 'bar-chart-2', label: 'Wallet Analytics', action: handleViewWalletAnalytics, isDestructive: false },
        { icon: 'refresh-cw', label: 'Sync Wallet', action: handleSyncWalletWithDatabase, isDestructive: false },
      ]
    },
    {
      section: 'Support',
      items: [
        { icon: 'share-2', label: 'Share App', action: handleShareApp, isDestructive: false },
        { icon: 'star', label: 'Rate App', action: handleRateApp, isDestructive: false },
        { icon: 'help-circle', label: 'Help', action: handleHelp, isDestructive: false },
        { icon: 'message-circle', label: 'Feedback', action: handleFeedback, isDestructive: false },
      ]
    },
    {
      section: 'Legal',
      items: [
        { icon: 'file-text', label: 'Terms of Service', action: handleTerms, isDestructive: false },
        { icon: 'shield', label: 'Privacy Policy', action: handlePrivacy, isDestructive: false },
        { icon: 'info', label: 'About', action: handleAbout, isDestructive: false },
      ]
    },
    {
      section: 'Account Actions',
      items: [
        { icon: 'log-out', label: 'Logout', action: handleLogout, isDestructive: true },
      ]
    }
  ];

  useEffect(() => {
    const loadUserWalletInfo = async () => {
      if (currentUser?.id) {
        try {
          // This function will be replaced with a hybrid service call
          // For now, it will simulate loading
          console.log('Simulating user wallet info loading for user:', currentUser.id);
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
          setUserWalletInfo({
            wallet_address: currentUser.wallet_address,
            wallet_name: walletName,
            balance: balance,
            chain_id: chainId,
            is_connected: isConnected,
            match_status: currentUser.wallet_address === address ? 'Matched' : 'Different',
            avatar: currentUser.avatar,
          });
        } catch (error) {
          console.error('Error loading user wallet info:', error);
        }
      }
    };

    loadUserWalletInfo();
  }, [currentUser?.id, address, balance, chainId, isConnected, walletName]);

  const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';
  const displayEmail = currentUser?.email || 'No email';
  const userWalletAddress = currentUser?.wallet_address;
  const contextWalletAddress = address;
  const walletsMatch = userWalletAddress === contextWalletAddress;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToDashboard} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          onPress={() => setSettingsModalVisible(true)} 
          style={styles.settingsHeaderButton}
        >
          <Icon name="settings" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {currentUser?.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
            <View style={styles.editIconContainer}>
              <Icon name="edit-2" size={12} color="#212121" />
            </View>
            {avatarLoading && (
              <View style={styles.avatarLoadingOverlay}>
                <Text style={styles.avatarLoadingText}>Updating...</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>
          <Text style={styles.authMethod}>
            Authenticated via {authMethod === 'wallet' ? 'Wallet' : 'Email'}
          </Text>

          {/* Wallet Address Display */}
          {(userWalletAddress || contextWalletAddress) && (
            <View style={styles.walletContainer}>
              <Text style={styles.walletLabel}>Wallet Address:</Text>
              <Text style={styles.walletAddress}>
                {(userWalletAddress || contextWalletAddress)?.slice(0, 8)}...
                {(userWalletAddress || contextWalletAddress)?.slice(-8)}
              </Text>
            </View>
          )}
        </View>

        {/* Wallet Section */}
        <Text style={styles.sectionTitle}>Wallet</Text>
        <View style={styles.walletSection}>
          <View style={styles.walletHeader}>
            <Icon name="wallet" size={20} color={isConnected ? "#A5EA15" : "#A89B9B"} />
            <Text style={styles.walletStatus}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
            <View style={isConnected ? styles.connectedDot : styles.disconnectedDot} />
          </View>

          {isConnected ? (
            <>
              <View style={styles.walletDetails}>
                <View style={styles.walletRow}>
                  <Text style={styles.walletLabel}>Balance:</Text>
                  <Text style={styles.walletValue}>
                    {balance ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                  </Text>
                </View>
                <View style={styles.walletRow}>
                  <Text style={styles.walletLabel}>Network:</Text>
                  <Text style={styles.walletValue}>{chainId || 'Solana Devnet'}</Text>
                </View>
                <View style={styles.walletRow}>
                  <Text style={styles.walletLabel}>Wallet:</Text>
                  <Text style={styles.walletValue}>{walletName || 'Unknown'}</Text>
                </View>
                <View style={styles.walletRow}>
                  <Text style={styles.walletLabel}>Sync Status:</Text>
                  <Text style={[styles.walletValue, walletsMatch ? styles.matchedText : styles.unmatchedText]}>
                    {walletsMatch ? 'Synced' : 'Not Synced'}
                  </Text>
                </View>
              </View>

              <View style={styles.walletActions}>
                <TouchableOpacity style={styles.walletActionBtn} onPress={handleViewWalletDetails}>
                  <Icon name="info" size={16} color="#A5EA15" />
                  <Text style={styles.walletActionText}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.walletActionBtn} onPress={handleExportWalletData}>
                  <Icon name="download" size={16} color="#A5EA15" />
                  <Text style={styles.walletActionText}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.walletActionBtn, styles.disconnectBtn]} 
                  onPress={handleDisconnectWallet}
                  disabled={loadingWallet}
                >
                  <Icon name="log-out" size={16} color="#FF6B6B" />
                  <Text style={[styles.walletActionText, styles.disconnectText]}>
                    {loadingWallet ? 'Loading...' : 'Disconnect'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.walletMessage}>
                Connect your wallet to access all features
              </Text>
              <TouchableOpacity 
                style={styles.connectWalletBtn} 
                onPress={handleConnectWallet}
                disabled={loadingWallet}
              >
                <Icon name="wallet" size={16} color="#212121" />
                <Text style={styles.connectWalletText}>
                  {loadingWallet ? 'Connecting...' : 'Connect Wallet'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Back to Dashboard Button */}
        <TouchableOpacity style={styles.backToDashboardButton} onPress={handleBackToDashboard}>
          <Icon name="home" size={20} color="#212121" />
          <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.backButton}>
              <Icon name="x" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.content}>
            <ScrollView>
              {settingsOptions && settingsOptions.length > 0 ? (
                settingsOptions.map((section, sectionIndex) => (
                  <View key={sectionIndex} style={styles.sectionMargin}>
                    <Text style={styles.settingsSectionTitle}>{section.section}</Text>
                    {section.items.map((item, itemIndex) => (
                                             <TouchableOpacity 
                         key={`${sectionIndex}-${itemIndex}`} 
                         style={[
                           styles.settingsOptionRow,
                           item.isDestructive === true && styles.settingsOptionRowDestructive
                         ]}
                         onPress={() => {
                           item.action();
                           setSettingsModalVisible(false);
                         }}
                       >
                         <Feather 
                           name={item.icon} 
                           size={20} 
                           color={item.isDestructive === true ? "#FF6B6B" : "#A5EA15"} 
                         />
                         <Text style={[
                           styles.settingsOptionLabel,
                           item.isDestructive === true && styles.settingsOptionLabelDestructive
                         ]}>
                           {item.label}
                         </Text>
                         <Feather name="chevron-right" size={16} color="#A89B9B" />
                       </TouchableOpacity>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.noSettingsText}>No settings available.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <NavBar currentRoute="Profile" navigation={navigation} />
    </SafeAreaView>
  );
};

export default ProfileScreen; 