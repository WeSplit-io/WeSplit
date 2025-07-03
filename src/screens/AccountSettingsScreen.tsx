import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  Switch,
  Clipboard 
} from 'react-native';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  sectionSelector: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeSectionTab: {
    backgroundColor: '#A5EA15',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A89B9B',
    marginLeft: 8,
  },
  activeSectionTabText: {
    color: '#212121',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  subsection: {
    marginBottom: 32,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A5EA15',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  readOnlyText: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#A89B9B',
    borderWidth: 1,
    borderColor: '#333',
  },
  primaryButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#A89B9B',
  },
  // Wallet-specific styles
  walletCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  walletDetails: {
    marginTop: 8,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    color: '#A89B9B',
    fontWeight: '500',
  },
  walletValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  walletAddress: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  copyableAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5EA15',
  },
  disconnectButton: {
    backgroundColor: '#FF6B6B',
    marginTop: 12,
  },
  disconnectText: {
    color: '#FFF',
    marginLeft: 8,
  },
  privateKeySection: {
    marginTop: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A5EA15',
    marginLeft: 8,
  },
  privateKeyDisplay: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  privateKeyWarning: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  privateKeyText: {
    fontSize: 12,
    color: '#FFF',
    fontFamily: 'monospace',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    padding: 8,
  },
  copyButtonText: {
    fontSize: 14,
    color: '#A5EA15',
    marginLeft: 8,
  },
  importSection: {
    marginTop: 16,
  },
  importButton: {
    marginTop: 12,
  },
});

export default AccountSettingsScreen;
