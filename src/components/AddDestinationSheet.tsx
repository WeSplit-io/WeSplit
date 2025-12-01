import React, { useState, useEffect } from 'react';
import { 
  View, 
  Alert,
  Keyboard,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Modal, Input, Button, Tabs } from './shared';
import { validateAddress, validateKastWalletAddress } from '../utils/network/sendUtils';
// Removed unused imports: colors, typography
import { spacing } from '../theme/spacing';
import MWADetectionButton from './wallet/MWADetectionButton';
import { getPlatformInfo } from '../utils/core/platformDetection';
import { ExternalCardService } from '../services/integrations/external/ExternalCardService';
import { logger } from '../services/analytics/loggingService';

// Destination type for wallet or card
export interface Destination {
  type: 'wallet' | 'kast';
  name: string;
  address: string;
  identifier?: string; // For backward compatibility
  chain?: string;
  // Card-specific fields (optional)
  cardType?: string;
  status?: string;
  balance?: number;
  currency?: string;
  expirationDate?: string;
  cardholderName?: string;
}

interface AddDestinationSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (destination: Destination) => void;
  isLoading?: boolean;
}

// Removed unused SCREEN_HEIGHT

const AddDestinationSheet: React.FC<AddDestinationSheetProps> = ({
  visible,
  onClose,
  onSaved,
  isLoading = false
}) => {
  const [destinationType, setDestinationType] = useState<'wallet' | 'kast'>('wallet');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [chain, setChain] = useState('solana');
  const [kastAddress, setKastAddress] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Reset form when modal becomes visible
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setAddress('');
    setName('');
    setChain('solana');
    setKastAddress('');
    setErrors({});
    setDestinationType('wallet'); // Reset to default type
  };

  // Clear form fields when switching between wallet and SOLANA card types
  useEffect(() => {
    // Clear the fields that are not relevant to the current type
    if (destinationType === 'wallet') {
      setKastAddress('');
    } else {
      setAddress('');
      setChain('solana');
    }
    // Clear any existing errors
    setErrors({});
  }, [destinationType]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (destinationType === 'wallet') {
      if (!address.trim()) {
        newErrors.address = 'Address is required';
      } else {
        try {
          const addressValidation = validateAddress(address.trim());
          if (!addressValidation.isValid) {
            newErrors.address = addressValidation.error || `Please enter a valid address for ${chain}`;
          }
        } catch (error) {
          logger.error('Address validation error', { error: error instanceof Error ? error.message : String(error) }, 'AddDestinationSheet');
          newErrors.address = 'Invalid address format';
        }
      }
    } else if (destinationType === 'kast') {
      if (!kastAddress.trim()) {
        newErrors.kastAddress = 'Solana card wallet address is required';
      } else {
        try {
          const addressValidation = validateKastWalletAddress(kastAddress.trim());
          if (!addressValidation.isValid) {
            newErrors.kastAddress = addressValidation.error || 'Please enter a valid Solana card wallet address';
          }
        } catch (error) {
          logger.error('KAST address validation error', { error: error instanceof Error ? error.message : String(error) }, 'AddDestinationSheet');
          newErrors.kastAddress = 'Invalid Solana card wallet address format';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    if (isLoading) {
      return false;
    }
    if (!name.trim()) {
      return false;
    }
    
    if (destinationType === 'wallet') {
      return address.trim().length > 0;
    } else {
      return kastAddress.trim().length > 0;
    }
  };

  const handleWalletDetected = (walletInfo: {
    name: string;
    address: string;
    publicKey: string;
    isMock?: boolean;
  }) => {
    // Auto-fill the form with detected wallet information
    setName(walletInfo.name);
    setAddress(walletInfo.address);
    
    // Clear any existing errors
    setErrors({});
    
    // Show success message
    Alert.alert(
      'Wallet Detected',
      `Successfully detected ${walletInfo.name} wallet!\n\nAddress: ${walletInfo.address.slice(0, 8)}...${walletInfo.address.slice(-8)}${walletInfo.isMock ? '\n\n(Mock wallet for demo purposes)' : ''}`
    );
  };

  const handleSave = async () => {
    if (isLoading || !validateForm()) {
      return;
    }

    try {
      // For SOLANA cards, validate the wallet address and get card information
      if (destinationType === 'kast') {
        try {
          // Validate SOLANA card wallet address
          const validation = await ExternalCardService.validateKastCard(kastAddress.trim());
          if (!validation.isValid) {
            setErrors({ kastAddress: validation.error || 'Invalid Solana card wallet address' });
            return;
          }

          // Get full card information
          const cardInfo = await ExternalCardService.getCardInfo(kastAddress.trim());
          if (!cardInfo.success || !cardInfo.card) {
            setErrors({ kastAddress: 'Failed to retrieve card information' });
            return;
          }

          // Create destination with full card information
          // Use 'address' field for consistency with external wallets
          const destination = {
            type: destinationType,
            name: name.trim(),
            address: kastAddress.trim(), // Use 'address' field for consistency
            identifier: kastAddress.trim(), // Keep identifier for backward compatibility
            cardType: cardInfo.card.cardType,
            status: cardInfo.card.status,
            balance: cardInfo.card.balance,
            currency: cardInfo.card.currency,
            expirationDate: cardInfo.card.expirationDate,
            cardholderName: cardInfo.card.cardholderName,
          };

          onSaved(destination);
          // Reset form after successful save
          resetForm();
          return;
        } catch (error) {
          logger.error('Error validating Solana card', { error: error instanceof Error ? error.message : String(error) }, 'AddDestinationSheet');
          setErrors({ kastAddress: 'Failed to validate card. Please try again.' });
          return;
        }
      }

      // For regular wallets, use existing logic
      const destination = {
        type: destinationType,
        name: name.trim(),
        address: address.trim(),
        chain
      };

      onSaved(destination);
      // Reset form after successful save
      resetForm();
    } catch (error) {
      logger.error('Error in handleSave', { error: error instanceof Error ? error.message : String(error) }, 'AddDestinationSheet');
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const renderWalletForm = () => {
    const platformInfo = getPlatformInfo();

    return (
      <View style={styles.formSection}>
        {/* MWA Detection Button - Only shown in development builds */}
        {platformInfo.isDevelopmentBuild && (
          <MWADetectionButton
            onWalletDetected={handleWalletDetected}
            disabled={isLoading}
            style={styles.mwaDetectionButton}
          />
        )}

        <Input
        label="Wallet Address"
        value={address}
        onChangeText={setAddress}
        placeholder="Enter wallet address"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.address}
        returnKeyType="done"
        onSubmitEditing={dismissKeyboard}
        blurOnSubmit={true}
      />

      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g., Cold Wallet, Treasury"
        autoCapitalize="words"
        autoCorrect={false}
        error={errors.name}
        returnKeyType="done"
        onSubmitEditing={dismissKeyboard}
        blurOnSubmit={true}
      />
    </View>
  );
};

  const renderKastForm = () => {
    return (
      <View style={styles.formSection}>
        <Input
          label="Solana Wallet Address"
          value={kastAddress}
          onChangeText={setKastAddress}
          placeholder="Enter Solana card wallet address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.kastAddress}
          returnKeyType="done"
          onSubmitEditing={dismissKeyboard}
          blurOnSubmit={true}
        />

        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Team Card, Marketing"
          autoCapitalize="words"
          autoCorrect={false}
          error={errors.name}
          returnKeyType="done"
          onSubmitEditing={dismissKeyboard}
          blurOnSubmit={true}
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Add Wallet or Card"
      showHandle={true}
      style={{
        maxHeight: keyboardHeight > 0 ? '95%' : '70%',
      }}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Tabs Component */}
        <Tabs
          tabs={[
            { label: 'Wallet', value: 'wallet' },
            { label: 'Solana Card', value: 'kast' }
          ]}
          activeTab={destinationType}
          onTabChange={(tab) => setDestinationType(tab as 'wallet' | 'kast')}
          enableAnimation={true}
        />

        {/* Form Content */}
        <View style={styles.formContent}>
          {destinationType === 'wallet' ? renderWalletForm() : renderKastForm()}
        </View>

        {/* Actions */}
        <View style={styles.modalActions}>
          <Button
            title={isLoading ? 'Saving...' : 'Save'}
            onPress={handleSave}
            disabled={!isFormValid()}
            loading={isLoading}
            fullWidth={true}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  formContent: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  formSection: {
    gap: spacing.md,
  },
  modalActions: {
    marginTop: 'auto',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  mwaDetectionButton: {
    marginBottom: spacing.md,
  },
});

export default AddDestinationSheet;