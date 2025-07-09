import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  Switch,
  Clipboard 
} from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import styles from './styles';

const AccountSettingsScreen = ({ navigation }: any) => {
  const { state, updateUser } = useApp();
  const { currentUser } = state;
  const { 
    isConnected, 
    address, 
    balance, 
    walletName, 
    chainId,
    secretKey,
    connectWallet,
    disconnectWallet 
  } = useWallet();
  
  // Form states
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  // Security states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  
  // Wallet states
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  
  // Section visibility
  const [activeSection, setActiveSection] = useState('profile');

  const handleSaveProfile = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    
    // Update user profile
    updateUser({ ...currentUser, name: name.trim() });
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleChangeEmail = () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a new email');
      return;
    }
    
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    
    // TODO: Implement email change logic
    Alert.alert('Email Change', 'Email change functionality will be implemented soon');
    setNewEmail('');
    setCurrentPassword('');
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      Alert.alert('Success', 'Wallet connected successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to connect wallet. Please try again.');
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      Alert.alert('Success', 'Wallet disconnected successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect wallet. Please try again.');
    }
  };

  const handleShowPrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };

  const handleCopyPrivateKey = () => {
    if (secretKey) {
      Clipboard.setString(secretKey);
      Alert.alert('Copied', 'Private key copied to clipboard!');
    }
  };

  const handleCopyAddress = (addressToCopy: string) => {
    Clipboard.setString(addressToCopy);
    Alert.alert('Copied', 'Address copied to clipboard!');
  };

  const handleImportWallet = async () => {
    if (!importKey.trim()) {
      Alert.alert('Error', 'Please enter a private key');
      return;
    }

    setImportLoading(true);
    try {
      // TODO: Implement wallet import logic
      Alert.alert('Import Wallet', 'Wallet import functionality will be implemented soon');
      setImportKey('');
    } catch (error) {
      Alert.alert('Error', 'Failed to import wallet. Please check your private key.');
    } finally {
      setImportLoading(false);
    }
  };

  const sections = [
    { id: 'profile', title: 'Edit Profile', icon: 'user' },
    { id: 'email', title: 'Change Email', icon: 'mail' },
    { id: 'wallet', title: 'Wallet Management', icon: 'key' },
  ];

  const renderSectionSelector = () => (
    <View style={styles.sectionSelector}>
      {sections.map((section) => (
        <TouchableOpacity
          key={section.id}
          style={[
            styles.sectionTab,
            activeSection === section.id && styles.activeSectionTab
          ]}
          onPress={() => setActiveSection(section.id)}
        >
          <Icon 
            name={section.icon} 
            size={16} 
            color={activeSection === section.id ? '#212121' : '#A89B9B'} 
          />
          <Text style={[
            styles.sectionTabText,
            activeSection === section.id && styles.activeSectionTabText
          ]}>
            {section.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor="#A89B9B"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Email</Text>
        <Text style={styles.readOnlyText}>{email}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProfile}>
        <Text style={styles.primaryButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Change Email Address</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Email</Text>
        <Text style={styles.readOnlyText}>{email}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Email Address</Text>
        <TextInput
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="Enter new email"
          placeholderTextColor="#A89B9B"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          placeholderTextColor="#A89B9B"
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleChangeEmail}>
        <Text style={styles.primaryButtonText}>Change Email</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWalletSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Wallet Management</Text>
      
      {/* App-Generated Wallet */}
      {(currentUser?.wallet_address || currentUser?.walletAddress) && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>App-Generated Wallet</Text>
          
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Icon name="user" size={20} color="#4A90E2" />
              <Text style={styles.walletType}>Primary Wallet</Text>
            </View>
            
            <View style={styles.walletDetails}>
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Address:</Text>
                <TouchableOpacity 
                  style={styles.copyableAddress} 
                  onPress={() => handleCopyAddress(currentUser.wallet_address || currentUser.walletAddress)}
                >
                  <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                    {currentUser.wallet_address || currentUser.walletAddress}
                  </Text>
                  <Icon name="copy" size={14} color="#4A90E2" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Status:</Text>
                <Text style={styles.walletValue}>Ready for Funding</Text>
              </View>
            </View>
          </View>
        </View>
      )}
      
      {/* Connected External Wallet */}
      {isConnected && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Connected External Wallet</Text>
          
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Icon name="link" size={20} color="#A5EA15" />
              <Text style={styles.walletType}>{walletName || 'External Wallet'}</Text>
              <View style={styles.connectedDot} />
            </View>
            
            <View style={styles.walletDetails}>
              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Address:</Text>
                <TouchableOpacity 
                  style={styles.copyableAddress} 
                  onPress={() => handleCopyAddress(address!)}
                >
                  <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                    {address}
                  </Text>
                  <Icon name="copy" size={14} color="#A5EA15" />
                </TouchableOpacity>
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
            </View>
            
            <TouchableOpacity 
              style={[styles.primaryButton, styles.disconnectButton]} 
              onPress={handleDisconnectWallet}
            >
              <Icon name="log-out" size={16} color="#FFF" />
              <Text style={[styles.primaryButtonText, styles.disconnectText]}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Wallet Actions */}
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Wallet Actions</Text>
        
        {!isConnected && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleConnectWallet}>
            <Icon name="link" size={16} color="#212121" />
            <Text style={styles.primaryButtonText}>Connect External Wallet</Text>
          </TouchableOpacity>
        )}
        
        {/* Private Key Management */}
        {secretKey && (
          <View style={styles.privateKeySection}>
            <TouchableOpacity 
              style={styles.toggleButton} 
              onPress={handleShowPrivateKey}
            >
              <Icon name={showPrivateKey ? "eye-off" : "eye"} size={16} color="#A5EA15" />
              <Text style={styles.toggleButtonText}>
                {showPrivateKey ? 'Hide' : 'Show'} Private Key
              </Text>
            </TouchableOpacity>
            
            {showPrivateKey && (
              <View style={styles.privateKeyDisplay}>
                <Text style={styles.privateKeyWarning}>
                  ⚠️ Warning: Never share your private key with anyone!
                </Text>
                <Text selectable style={styles.privateKeyText}>{secretKey}</Text>
                <TouchableOpacity 
                  style={styles.copyButton} 
                  onPress={handleCopyPrivateKey}
                >
                  <Icon name="copy" size={16} color="#A5EA15" />
                  <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        
        {/* Import Wallet */}
        <View style={styles.importSection}>
          <Text style={styles.label}>Import External Wallet</Text>
          <TextInput
            style={styles.input}
            value={importKey}
            onChangeText={setImportKey}
            placeholder="Enter private key (hex string)"
            placeholderTextColor="#A89B9B"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TouchableOpacity 
            style={[styles.primaryButton, styles.importButton]} 
            onPress={handleImportWallet}
            disabled={importLoading}
          >
            <Icon name="download" size={16} color="#212121" />
            <Text style={styles.primaryButtonText}>
              {importLoading ? 'Importing...' : 'Import Wallet'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Security Options */}
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Security Options</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
            <Text style={styles.settingDescription}>Add extra security to your account</Text>
          </View>
          <Switch
            value={twoFactorEnabled}
            onValueChange={setTwoFactorEnabled}
            trackColor={{ false: '#A89B9B', true: '#A5EA15' }}
            thumbColor={twoFactorEnabled ? '#FFF' : '#FFF'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Biometric Login</Text>
            <Text style={styles.settingDescription}>Use fingerprint or face recognition</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
            trackColor={{ false: '#A89B9B', true: '#A5EA15' }}
            thumbColor={biometricEnabled ? '#FFF' : '#FFF'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Login Alerts</Text>
            <Text style={styles.settingDescription}>Get notified of suspicious activity</Text>
          </View>
          <Switch
            value={loginAlertsEnabled}
            onValueChange={setLoginAlertsEnabled}
            trackColor={{ false: '#A89B9B', true: '#A5EA15' }}
            thumbColor={loginAlertsEnabled ? '#FFF' : '#FFF'}
          />
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'email':
        return renderEmailSection();
      case 'wallet':
        return renderWalletSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {renderSectionSelector()}

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountSettingsScreen; 