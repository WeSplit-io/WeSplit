import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, SafeAreaView, Clipboard, TextInput, Modal, Linking, Share } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';
import { importWallet } from '../../utils/walletService';
import { createMoonPayURL } from '../services/moonpayService';
import { getUserWallet, updateUserWallet } from '../services/userService';
import Feather from 'react-native-vector-icons/Feather';

const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const { state, logoutUser } = useApp();
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
              navigation.replace('Auth');
            } catch (error) {
              console.error('Logout error:', error);
              // Still logout from app even if wallet disconnect fails
              logoutUser();
              navigation.replace('Auth');
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
    const userWalletAddress = currentUser?.wallet_address || currentUser?.walletAddress;
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
    const userWalletAddress = currentUser?.wallet_address || currentUser?.walletAddress;
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
    const userWalletAddress = currentUser?.walletAddress;
    const contextWalletAddress = address;
    
    Alert.alert(
      'Wallet Details',
      `User Wallet (Database):\n` +
      `Address: ${userWalletAddress || 'Not set'}\n\n` +
      `Connected Wallet:\n` +
      `Wallet Name: ${walletName || 'Unknown'}\n` +
      `Address: ${contextWalletAddress || 'Not connected'}\n` +
      `Chain: ${chainId || 'Solana Devnet'}\n` +
      `Balance: ${balance ? `${balance.toFixed(4)} SOL` : 'Loading...'}\n` +
      `Connected: ${isConnected ? 'Yes' : 'No'}\n\n` +
      `Status: ${userWalletAddress === contextWalletAddress ? '✅ Matched' : '⚠️ Different'}`,
      [{ text: 'OK' }]
    );
  };

  const handleShowPrivateKey = () => {
    setShowPrivateKey(true);
  };

  const handleCopyPrivateKey = () => {
    if (secretKey) {
      Clipboard.setString(secretKey);
      Alert.alert('Copied', 'Private key copied to clipboard!');
    }
  };

  const handleImportWallet = async () => {
    if (!importKey) {
      Alert.alert('Error', 'Please enter your private key.');
      return;
    }
    setImportLoading(true);
    try {
      await importWallet(importKey);
      setImportModalVisible(false);
      setImportKey('');
      Alert.alert('Success', 'Wallet imported successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to import wallet. Please check your private key.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleFundWithMoonPay = async () => {
    // Use the app-generated wallet address as priority, fallback to connected wallet
    const walletToFund = currentUser?.wallet_address || currentUser?.walletAddress || address;
    
    if (!walletToFund) {
      Alert.alert('Error', 'No wallet address available for funding.');
      return;
    }

    setFundingLoading(true);
    try {
      console.log('Starting MoonPay funding for wallet:', walletToFund);
      
      const moonpayResponse = await createMoonPayURL(walletToFund, undefined);
      
      console.log('MoonPay URL received:', moonpayResponse.url);
      
      // Open MoonPay in browser
      await Linking.openURL(moonpayResponse.url);
      
      setMoonpayModalVisible(false);
      Alert.alert('Success', 'MoonPay opened in browser. Complete your purchase to fund your wallet.');
    } catch (e) {
      console.error('MoonPay funding error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to open MoonPay. Please try again.';
      Alert.alert('MoonPay Error', errorMessage);
    } finally {
      setFundingLoading(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out WeSplit! Split expenses with friends easily and securely. Download now: https://wesplit.app',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share the app.');
    }
  };

  const handleRateApp = () => {
    Linking.openURL('https://wesplit.app/rate');
  };

  const handleHelp = () => {
    Linking.openURL('https://wesplit.app/help');
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:support@wesplit.app?subject=Feedback');
  };

  const handleTerms = () => {
    Linking.openURL('https://wesplit.app/terms');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://wesplit.app/privacy');
  };

  const handleAbout = () => {
    Alert.alert('About WeSplit', 'WeSplit v1.0.0\n\nSplit expenses with friends easily and securely.');
  };

  // Load user wallet info on component mount
  useEffect(() => {
    const loadUserWalletInfo = async () => {
      if (currentUser?.id) {
        try {
          const walletInfo = await getUserWallet(currentUser.id);
          setUserWalletInfo(walletInfo);
          console.log('Loaded user wallet info:', walletInfo);
        } catch (e) {
          console.error('Error loading user wallet info:', e);
        }
      }
    };

    loadUserWalletInfo();
  }, [currentUser?.id]);

  // Debug logging
  useEffect(() => {
    if (currentUser) {
      console.log('ProfileScreen - User wallet address:', currentUser.wallet_address || currentUser.walletAddress);
    }
  }, [currentUser]);

  // DEBUG: Log settingsOptions when modal is visible
  useEffect(() => {
    if (settingsModalVisible) {
      console.log('settingsOptions:', settingsOptions);
    }
  }, [settingsModalVisible]);

  const settingsOptions = [
    {
      section: 'Account',
      items: [
        { icon: 'user', label: 'Account Settings', action: () => navigation.navigate('AccountSettings'), isDestructive: false },
      ]
    },
    {
      section: 'Wallet',
      items: [
        { icon: 'download', label: 'Export Wallet Data', action: handleExportWalletData, isDestructive: false },
        { icon: 'refresh-cw', label: 'Sync Wallet', action: handleSyncWalletWithDatabase, isDestructive: false },
        { icon: 'bar-chart', label: 'Wallet Analytics', action: handleViewWalletAnalytics, isDestructive: false },
      ]
    },
    {
      section: 'App',
      items: [
        { icon: 'star', label: 'Premium Features', action: () => navigation.navigate('Premium'), isDestructive: false },
        { icon: 'bell', label: 'Notifications', action: () => navigation.navigate('Notifications'), isDestructive: false },
        { icon: 'moon', label: 'Dark Mode', action: () => Alert.alert('Dark Mode', 'Already enabled!'), isDestructive: false },
        { icon: 'globe', label: 'Language', action: () => navigation.navigate('Language'), isDestructive: false },
      ]
    },
    {
      section: 'Support',
      items: [
        { icon: 'help-circle', label: 'Help & Support', action: handleHelp, isDestructive: false },
        { icon: 'share-2', label: 'Share WeSplit', action: handleShareApp, isDestructive: false },
        { icon: 'star', label: 'Rate App', action: handleRateApp, isDestructive: false },
        { icon: 'message-circle', label: 'Feedback', action: handleFeedback, isDestructive: false },
      ]
    },
    {
      section: 'Legal',
      items: [
        { icon: 'file-text', label: 'Terms of Service', action: handleTerms, isDestructive: false },
        { icon: 'shield', label: 'Privacy Policy', action: handlePrivacy, isDestructive: false },
        { icon: 'info', label: 'About WeSplit', action: handleAbout, isDestructive: false },
      ]
    },
    {
      section: 'Account',
      items: [
        { icon: 'log-out', label: 'Logout', action: handleLogout, isDestructive: true },
      ]
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.settingsHeaderButton}>
          <Icon name="settings" size={24} color="#A5EA15" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{currentUser?.name || 'User'}</Text>
          <Text style={styles.email}>{currentUser?.email}</Text>
          <Text style={styles.authMethod}>Signed in with {authMethod}</Text>
        </View>

        {/* Wallet Information Section */}
        <Text style={styles.sectionTitle}>Wallet Information</Text>
        
        {/* Database Wallet Info */}
        {(currentUser?.wallet_address || currentUser?.walletAddress) && (
          <View style={styles.walletSection}>
            <View style={styles.walletHeader}>
              <Icon name="user" size={20} color="#4A90E2" />
              <Text style={styles.walletStatus}>App-Generated Wallet</Text>
            </View>
            
            <View style={styles.walletDetails}>
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Address:</Text>
                <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                  {currentUser.wallet_address || currentUser.walletAddress}
                </Text>
              </View>
              
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Status:</Text>
                <Text style={styles.walletValue}>Ready for Funding</Text>
              </View>
              
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Type:</Text>
                <Text style={styles.walletValue}>Primary Wallet</Text>
              </View>
            </View>
            
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.walletActionBtn} onPress={() => {
                Clipboard.setString(currentUser.wallet_address || currentUser.walletAddress);
                Alert.alert('Copied', 'Wallet address copied to clipboard!');
              }}>
                <Icon name="copy" size={16} color="#4A90E2" />
                <Text style={styles.walletActionText}>Copy Address</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.walletActionBtn} 
                onPress={() => navigation.navigate('Deposit')}
              >
                <Icon name="plus-circle" size={16} color="#4A90E2" />
                <Text style={styles.walletActionText}>Deposit Funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Connected Wallet Info */}
        {isConnected ? (
          <View style={styles.walletSection}>
            <View style={styles.walletHeader}>
              <Icon name="user" size={20} color="#A5EA15" />
              <Text style={styles.walletStatus}>Connected Wallet</Text>
              <View style={styles.connectedDot} />
            </View>
            
            <View style={styles.walletDetails}>
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Wallet:</Text>
                <Text style={styles.walletValue}>{walletName || 'Unknown'}</Text>
              </View>
              
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Address:</Text>
                <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                  {address}
                </Text>
              </View>
              
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
                <Text style={styles.walletLabel}>Match Status:</Text>
                <Text style={[styles.walletValue, 
                  (currentUser?.wallet_address || currentUser?.walletAddress) === address ? styles.matchedText : styles.unmatchedText]}>
                  {(currentUser?.wallet_address || currentUser?.walletAddress) === address ? '✅ Matched' : '⚠️ Different'}
                </Text>
              </View>
            </View>
            
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.walletActionBtn} onPress={handleViewWalletDetails}>
                <Icon name="eye" size={16} color="#A5EA15" />
                <Text style={styles.walletActionText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.walletActionBtn, styles.disconnectBtn]} 
                onPress={handleDisconnectWallet}
                disabled={loadingWallet}
              >
                {loadingWallet ? (
                  <Icon name="loader" size={16} color="#FF6B6B" />
                ) : (
                  <Icon name="log-out" size={16} color="#FF6B6B" />
                )}
                <Text style={[styles.walletActionText, styles.disconnectText]}>
                  {loadingWallet ? 'Disconnecting...' : 'Disconnect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.walletSection}>
            <View style={styles.walletHeader}>
              <Icon name="user" size={20} color="#A89B9B" />
              <Text style={styles.walletStatus}>Not Connected</Text>
              <View style={styles.disconnectedDot} />
            </View>
            
            <Text style={styles.walletMessage}>
              Connect your wallet to access all features
            </Text>
            
            <TouchableOpacity 
              style={styles.connectWalletBtn} 
              onPress={handleConnectWallet}
              disabled={loadingWallet}
            >
              {loadingWallet ? (
                <Icon name="loader" size={16} color="#212121" />
              ) : (
                <Icon name="link" size={16} color="#212121" />
              )}
              <Text style={styles.connectWalletText}>
                {loadingWallet ? 'Connecting...' : 'Connect Wallet'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity 
            style={styles.quickActionButton} 
            onPress={() => setImportModalVisible(true)}
          >
            <Icon name="log-in" size={20} color="#A5EA15" />
            <Text style={styles.quickActionText}>Import Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton} 
            onPress={() => navigation.navigate('Deposit')}
          >
            <Icon name="plus-circle" size={20} color="#A5EA15" />
            <Text style={styles.quickActionText}>Deposit Funds</Text>
          </TouchableOpacity>

          {secretKey && (
            <TouchableOpacity 
              style={styles.quickActionButton} 
              onPress={handleShowPrivateKey}
            >
              <Icon name="key" size={20} color="#A5EA15" />
              <Text style={styles.quickActionText}>Private Key</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Private Key Display */}
        {showPrivateKey && secretKey && (
          <View style={styles.privateKeySection}>
            <Text style={styles.privateKeyWarning}>⚠️ Warning: Never share your private key!</Text>
            <Text selectable style={styles.privateKeyText}>{secretKey}</Text>
            <TouchableOpacity onPress={handleCopyPrivateKey} style={styles.copyPrivateKeyButton}>
              <Text style={styles.copyPrivateKeyText}>Copy to Clipboard</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.backToDashboardButton} onPress={handleBackToDashboard}>
          <Icon name="home" size={20} color="#212121" />
          <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#232323', borderRadius: 12, padding: 24, width: '85%' }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Import Wallet</Text>
            <Text style={{ color: '#A89B9B', marginBottom: 8 }}>Paste your private key (hex string):</Text>
            <TextInput
              style={{ backgroundColor: '#181818', color: '#FFF', borderRadius: 8, padding: 12, marginBottom: 16 }}
              value={importKey}
              onChangeText={setImportKey}
              placeholder="Enter your private key"
              placeholderTextColor="#A89B9B"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setImportModalVisible(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#A89B9B', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleImportWallet} disabled={importLoading}>
                <Text style={{ color: '#A5EA15', fontWeight: 'bold' }}>{importLoading ? 'Importing...' : 'Import'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={moonpayModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMoonpayModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#232323', borderRadius: 12, padding: 24, width: '85%' }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Fund with MoonPay</Text>
            <Text style={{ color: '#A89B9B', marginBottom: 16 }}>
              You will be redirected to MoonPay to purchase SOL directly to your wallet.
            </Text>
            <Text style={{ color: '#A89B9B', fontSize: 12, marginBottom: 16 }}>
              Wallet: {currentUser?.wallet_address || currentUser?.walletAddress || address || 'Not available'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setMoonpayModalVisible(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#A89B9B', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFundWithMoonPay} disabled={fundingLoading}>
                <Text style={{ color: '#A5EA15', fontWeight: 'bold' }}>
                  {fundingLoading ? 'Opening...' : 'Open MoonPay'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#232323', borderRadius: 12, padding: 24, width: '85%', minHeight: 200 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Icon name="x" size={24} color="#A89B9B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {settingsOptions && settingsOptions.length > 0 ? (
                settingsOptions.map((section, sectionIndex) => (
                  <View key={sectionIndex} style={{ marginBottom: 20 }}>
                    <Text style={styles.settingsSectionTitle}>{section.section}</Text>
                    {section.items.map((item, itemIndex) => (
                      <TouchableOpacity 
                        key={`${sectionIndex}-${itemIndex}`} 
                        style={[
                          styles.settingsOptionRow,
                          item.isDestructive && styles.settingsOptionRowDestructive
                        ]}
                        onPress={() => {
                          item.action();
                          setSettingsModalVisible(false);
                        }}
                      >
                        <Feather 
                          name={item.icon} 
                          size={20} 
                          color={item.isDestructive ? "#FF6B6B" : "#A5EA15"} 
                        />
                        <Text style={[
                          styles.settingsOptionLabel,
                          item.isDestructive && styles.settingsOptionLabelDestructive
                        ]}>
                          {item.label}
                        </Text>
                        <Feather name="chevron-right" size={16} color="#A89B9B" />
                      </TouchableOpacity>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={{ color: '#FFF', textAlign: 'center', marginTop: 40 }}>No settings available.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: '#212121',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  settingsHeaderButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    backgroundColor: '#212121',
    borderRadius: 12,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212121',
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold as any,
    color: '#FFF',
    marginBottom: 2,
  },
  email: {
    fontSize: fontSizes.md,
    color: '#A89B9B',
    marginBottom: spacing.sm,
  },
  walletContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  walletLabel: {
    fontSize: fontSizes.sm,
    color: '#A89B9B',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: fontSizes.sm,
    color: '#A5EA15',
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    color: '#A89B9B',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    fontWeight: fontWeights.medium as any,
  },
  walletSection: {
    backgroundColor: '#212121',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  walletStatus: {
    fontSize: fontSizes.md,
    color: '#FFF',
    marginLeft: spacing.sm,
    fontWeight: fontWeights.medium as any,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5EA15',
    marginLeft: spacing.sm,
  },
  disconnectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A89B9B',
    marginLeft: spacing.sm,
  },
  walletDetails: {
    marginBottom: spacing.md,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  walletValue: {
    fontSize: fontSizes.sm,
    color: '#FFF',
    fontWeight: fontWeights.medium as any,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#A5EA15',
    flex: 1,
    marginHorizontal: 4,
  },
  walletActionText: {
    fontSize: fontSizes.sm,
    color: '#A5EA15',
    marginLeft: spacing.xs,
    fontWeight: fontWeights.medium as any,
  },
  disconnectBtn: {
    borderColor: '#FF6B6B',
  },
  disconnectText: {
    color: '#FF6B6B',
  },
  walletMessage: {
    fontSize: fontSizes.sm,
    color: '#A89B9B',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  connectWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: 8,
    padding: spacing.md,
  },
  connectWalletText: {
    fontSize: fontSizes.md,
    color: '#212121',
    fontWeight: fontWeights.medium as any,
    marginLeft: spacing.xs,
  },
  matchedText: {
    color: '#A5EA15',
  },
  unmatchedText: {
    color: '#FF6B6B',
  },

  authMethod: {
    fontSize: fontSizes.sm,
    color: '#A89B9B',
    marginTop: spacing.sm,
  },

  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: radii.input,
    padding: spacing.md,
  },
  backToDashboardButtonText: {
    color: '#212121',
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    marginLeft: spacing.sm,
  },

  privateKeySection: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  privateKeyWarning: {
    color: '#FF6B6B',
    fontWeight: fontWeights.bold as any,
    marginBottom: spacing.sm,
    fontSize: fontSizes.sm,
  },
  privateKeyText: {
    color: '#FFF',
    fontFamily: 'monospace',
    marginBottom: spacing.md,
    fontSize: fontSizes.sm,
  },
  copyPrivateKeyButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 6,
    padding: spacing.sm,
    alignSelf: 'flex-start',
  },
  copyPrivateKeyText: {
    color: '#212121',
    fontWeight: fontWeights.bold as any,
    fontSize: fontSizes.sm,
  },
  settingsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderWidth: 1,
    borderColor: '#A5EA15',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#181818',
  },
  settingsOptionLabel: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    marginLeft: 12,
  },
  quickActionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#A5EA15',
    minWidth: 120,
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: fontSizes.sm,
    color: '#A5EA15',
    marginLeft: spacing.xs,
    fontWeight: fontWeights.medium as any,
  },
  settingsSectionTitle: {
    fontSize: fontSizes.md,
    color: '#A5EA15',
    fontWeight: fontWeights.bold as any,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  settingsOptionRowDestructive: {
    borderColor: '#FF6B6B',
  },
  settingsOptionLabelDestructive: {
    color: '#FF6B6B',
  },
});

export default ProfileScreen; 