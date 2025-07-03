import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { useApp } from '../context/AppContext';
import QRCode from 'react-native-qrcode-svg';
import Icon from '../components/Icon';
import { colors, fontSizes, fontWeights, spacing } from '../lib/theme';
import { Clipboard } from 'react-native';
import { createMoonPayURL } from '../services/moonpayService';
import { Linking } from 'react-native';
import { fundGroupWallet } from '../services/groupWalletService';

interface DepositParams {
  targetWallet?: {
    address: string;
    name: string;
    type: 'personal' | 'group';
  };
  groupId?: string;
  prefillAmount?: number;
  onSuccess?: () => void;
}

const DepositScreen: React.FC<any> = ({ navigation, route }) => {
  const { address } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;
  const [fundingLoading, setFundingLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  
  const params: DepositParams = route?.params || {};
  const isGroupWallet = params.targetWallet?.type === 'group';
  
  // Use target wallet if provided, otherwise use user's personal wallet
  const depositAddress = params.targetWallet?.address || 
                         currentUser?.wallet_address || 
                         currentUser?.walletAddress || 
                         address;
  
  const walletName = params.targetWallet?.name || 'Your Wallet';
  
  // Pre-fill amount if provided
  useEffect(() => {
    if (params.prefillAmount) {
      setCustomAmount(params.prefillAmount.toString());
    }
  }, [params.prefillAmount]);

  // Debug logging
  useEffect(() => {
    if (currentUser) {
      console.log('DepositScreen - Using wallet address:', depositAddress);
      console.log('DepositScreen - Is group wallet:', isGroupWallet);
      console.log('DepositScreen - Wallet name:', walletName);
    }
  }, [depositAddress, isGroupWallet, walletName]);

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

  const handleFundWithMoonPay = async () => {
    if (!depositAddress) {
      Alert.alert('Error', 'No wallet address available for funding.');
      return;
    }

    setFundingLoading(true);
    try {
      const amount = customAmount ? parseFloat(customAmount) : undefined;
      const moonpayResponse = await createMoonPayURL(depositAddress, amount);
      
      // Open MoonPay in browser
      await Linking.openURL(moonpayResponse.url);
      
      Alert.alert('Success', 'MoonPay opened in browser. Complete your purchase to fund the wallet.');
    } catch (e) {
      Alert.alert('Error', 'Failed to open MoonPay. Please try again.');
    } finally {
      setFundingLoading(false);
    }
  };

  const handleDirectFunding = async () => {
    if (!isGroupWallet || !params.groupId || !customAmount) {
      Alert.alert('Error', 'Missing required information for group wallet funding.');
      return;
    }

    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      setFundingLoading(true);
      
      // Use current user's wallet address as the funding source
      const userWalletAddress = currentUser?.wallet_address || address;
      if (!userWalletAddress) {
        Alert.alert('Error', 'No source wallet found for funding.');
        return;
      }

      await fundGroupWallet(
        params.groupId,
        currentUser?.id?.toString() || '',
        amount,
        'USDC',
        userWalletAddress
      );

      Alert.alert(
        'Funding Successful',
        `Successfully funded ${walletName} with ${amount} USDC.`,
        [
          {
            text: 'OK',
            onPress: () => {
              params.onSuccess?.();
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error funding group wallet:', error);
      Alert.alert('Error', 'Failed to fund group wallet. Please try again.');
    } finally {
      setFundingLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={24} color="#FFF" />
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {isGroupWallet ? `Fund ${walletName}` : 'Deposit to Your Wallet'}
        </Text>
        
        <Text style={styles.instructions}>
          {isGroupWallet 
            ? `Send funds to the shared group wallet. All members can use these funds for automatic expense settlement.`
            : 'Send SOL or any supported Solana token to your app-generated wallet address below. You can use any exchange or wallet app.'
          }
        </Text>
        
        {/* Wallet Source Indicator */}
        <View style={styles.walletSourceIndicator}>
          <Icon name={isGroupWallet ? "users" : "database"} size={16} color={isGroupWallet ? "#FF6B35" : "#4A90E2"} />
          <Text style={styles.walletSourceText}>
            {isGroupWallet ? 'Group Shared Wallet' : 'App-Generated Wallet'}
          </Text>
        </View>

        {/* Amount Input for Group Wallets */}
        {isGroupWallet && (
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount to Fund (USDC)</Text>
            <TextInput
              style={styles.amountInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0.00"
              placeholderTextColor="#A89B9B"
              keyboardType="numeric"
            />
            {params.prefillAmount && (
              <Text style={styles.prefillNote}>
                Suggested amount to settle your expenses
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.qrContainer}>
          {depositAddress ? (
            <QRCode value={depositAddress} size={180} backgroundColor="#212121" color="#A5EA15" />
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
        
        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">{depositAddress}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy} disabled={!depositAddress}>
              <Icon name="copy" size={18} color="#A5EA15" />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} disabled={!depositAddress}>
              <Icon name="share-2" size={18} color="#A5EA15" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
          
          {/* Funding Buttons */}
          <View style={styles.fundingButtons}>
            {/* MoonPay Funding Button */}
            <TouchableOpacity 
              style={[styles.moonpayButton, isGroupWallet && styles.moonpayButtonSecondary]} 
              onPress={handleFundWithMoonPay}
              disabled={!depositAddress || fundingLoading}
            >
              {fundingLoading ? (
                <Icon name="loader" size={18} color="#212121" />
              ) : (
                <Icon name="credit-card" size={18} color="#212121" />
              )}
              <Text style={styles.moonpayButtonText}>
                {fundingLoading ? 'Opening...' : 'Fund with MoonPay'}
              </Text>
            </TouchableOpacity>

            {/* Direct Funding Button for Group Wallets */}
            {isGroupWallet && (
              <TouchableOpacity 
                style={[styles.directFundButton, (!customAmount || fundingLoading) && styles.disabledButton]} 
                onPress={handleDirectFunding}
                disabled={!customAmount || fundingLoading}
              >
                <Icon name="zap" size={18} color="#FFF" />
                <Text style={styles.directFundButtonText}>
                  Fund Now ({customAmount || '0'} USDC)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipText}>
            {isGroupWallet 
              ? 'Funds added to the group wallet can be used by any member to settle expenses automatically.'
              : 'Only send Solana (SOL) or Solana-based tokens to this address. Sending unsupported assets may result in loss of funds.'
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.xl,
    color: '#FFF',
    fontWeight: fontWeights.bold as any,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  instructions: {
    color: '#A89B9B',
    fontSize: fontSizes.md,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  walletSourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  walletSourceText: {
    color: '#FFF',
    fontSize: fontSizes.sm,
    marginLeft: 8,
    fontWeight: fontWeights.medium as any,
  },
  amountSection: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  amountLabel: {
    color: '#FFF',
    fontSize: fontSizes.md,
    marginBottom: 8,
    fontWeight: fontWeights.medium as any,
  },
  amountInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#A5EA15',
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
  },
  prefillNote: {
    color: '#A89B9B',
    fontSize: fontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  qrContainer: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: fontSizes.md,
  },
  addressBox: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  addressLabel: {
    color: '#A89B9B',
    fontSize: fontSizes.sm,
    marginBottom: 4,
  },
  addressValue: {
    color: '#A5EA15',
    fontSize: fontSizes.md,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    color: '#A5EA15',
    fontSize: fontSizes.sm,
    marginLeft: 4,
    fontWeight: fontWeights.medium as any,
  },
  fundingButtons: {
    width: '100%',
  },
  moonpayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  moonpayButtonSecondary: {
    backgroundColor: '#2A2A2A',
    borderColor: '#A5EA15',
    borderWidth: 1,
  },
  moonpayButtonText: {
    color: '#212121',
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium as any,
    marginLeft: 8,
  },
  directFundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 12,
  },
  directFundButtonText: {
    color: '#FFF',
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium as any,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  tipBox: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  tipTitle: {
    color: '#A5EA15',
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold as any,
    marginBottom: 8,
  },
  tipText: {
    color: '#A89B9B',
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  createWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  createWalletText: {
    color: '#A5EA15',
    fontSize: fontSizes.sm,
    marginLeft: 4,
    fontWeight: fontWeights.medium as any,
  },
});

export default DepositScreen; 