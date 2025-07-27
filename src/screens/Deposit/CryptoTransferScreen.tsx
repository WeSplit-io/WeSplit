import React from 'react';
import { View, Text, TouchableOpacity, Alert, Share, SafeAreaView, Image } from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import QRCode from 'react-native-qrcode-svg';
import Icon from '../../components/Icon';
import { Clipboard } from 'react-native';
import styles from './styles';
import { colors } from '../../theme';

interface CryptoTransferParams {
  targetWallet?: {
    address: string;
    name: string;
    type: 'personal' | 'group';
  };
  groupId?: string;
  prefillAmount?: number;
  onSuccess?: () => void;
}

const CryptoTransferScreen: React.FC<any> = ({ navigation, route }) => {
  const { address } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;

  const params: CryptoTransferParams = route?.params || {};
  const isGroupWallet = params.targetWallet?.type === 'group';

  // Use target wallet if provided, otherwise use user's personal wallet
  const depositAddress = params.targetWallet?.address ||
    currentUser?.wallet_address ||
    address;

  const walletName = params.targetWallet?.name || 'Your Wallet';

  const handleCopy = () => {
    if (depositAddress) {
      Clipboard.setString(depositAddress);
      Alert.alert('Copied', 'Wallet address copied to clipboard!');
    }
  };

  const handleShare = async () => {
    if (depositAddress) {
      try {
        await Share.share({
          message: `Send funds to ${isGroupWallet ? 'our group' : 'my'} Solana wallet: ${depositAddress}`,
        });
      } catch (e) {
        Alert.alert('Error', 'Could not share address.');
      }
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={{ width: 24, height: 24 }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crypto Transfer</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>

        <View style={styles.mainContent}>
          {/* QR Code Section */}
          <View style={styles.qrSection}>
            {depositAddress ? (
              <View style={styles.qrContainer}>
                <QRCode
                  value={depositAddress}
                  size={200}
                  backgroundColor={colors.white}
                  color="#000"
                />
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.errorText}>No wallet address found.</Text>
                <TouchableOpacity style={styles.createWalletBtn} onPress={() => navigation.navigate('Profile')}>
                  <Icon name="log-in" size={18} color="#A5EA15" />
                  <Text style={styles.createWalletText}>Import or Create Wallet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Address Display */}
          {depositAddress && (
            <View style={styles.addressDisplay}>
              <Text style={styles.addressLabel}>Wallet Address</Text>
              <Text style={styles.addressValue} numberOfLines={2} ellipsizeMode="middle">
                {depositAddress}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {depositAddress && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <Icon name="copy" size={18} color="#212121" />
                <Text style={styles.actionButtonText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Icon name="share-2" size={18} color="#212121" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tip Section */}
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Tip</Text>
            <Text style={styles.tipText}>
              {isGroupWallet
                ? 'Send funds to the shared group wallet. All members can use these funds for automatic expense settlement.'
                : 'Only send Solana (SOL) or Solana-based tokens to this address. Sending unsupported assets may result in loss of funds.'
              }
            </Text>
          </View>
        </View>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CryptoTransferScreen; 