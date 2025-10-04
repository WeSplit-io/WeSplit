import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { colors } from '../theme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { validateAddress, validateKastIdentifier } from '../utils/sendUtils';
import { styles } from './AddDestinationSheetStyles';

interface AddDestinationSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (destination: any) => void;
}

const AddDestinationSheet: React.FC<AddDestinationSheetProps> = ({
  visible,
  onClose,
  onSaved
}) => {
  const [destinationType, setDestinationType] = useState<'wallet' | 'kast'>('wallet');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [chain, setChain] = useState('solana');
  const [identifier, setIdentifier] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const resetForm = () => {
    setAddress('');
    setName('');
    setChain('solana');
    setIdentifier('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
        const addressValidation = validateAddress(address.trim());
        if (!addressValidation.isValid) {
          newErrors.address = `Please enter a valid address for ${chain}`;
        }
      }
    } else if (destinationType === 'kast') {
      const identifierValidation = validateKastIdentifier(identifier);
      if (!identifierValidation.isValid) {
        newErrors.identifier = identifierValidation.error || 'Please enter a valid card identifier';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const destination = {
      type: destinationType,
      name: name.trim(),
      ...(destinationType === 'wallet' 
        ? { address: address.trim(), chain }
        : { identifier: identifier.trim() }
      )
    };

    onSaved(destination);
    handleClose();
  };

  const renderWalletForm = () => (
    <View style={styles.formSection}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Address</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter wallet address"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.qrButton}>
            <Text style={styles.qrButtonText}>📷</Text>
          </TouchableOpacity>
        </View>
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Cold Wallet, Treasury"
          placeholderTextColor={colors.textSecondary}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Chain</Text>
        <View style={styles.selectContainer}>
          <Text style={styles.selectText}>Solana</Text>
        </View>
      </View>
    </View>
  );

  const renderKastForm = () => (
    <View style={styles.formSection}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Card Identifier</Text>
        <TextInput
          style={styles.textInput}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Enter card token or last 4 digits"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.identifier && <Text style={styles.errorText}>{errors.identifier}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Team Card, Marketing"
          placeholderTextColor={colors.textSecondary}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.grabHandle} />
              <Text style={styles.modalTitle}>Add Destination</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  destinationType === 'wallet' && styles.segmentActive
                ]}
                onPress={() => setDestinationType('wallet')}
              >
                <Text style={[
                  styles.segmentText,
                  destinationType === 'wallet' && styles.segmentTextActive
                ]}>
                  Wallet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  destinationType === 'kast' && styles.segmentActive
                ]}
                onPress={() => setDestinationType('kast')}
              >
                <Text style={[
                  styles.segmentText,
                  destinationType === 'kast' && styles.segmentTextActive
                ]}>
                  KAST Card
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              {destinationType === 'wallet' ? renderWalletForm() : renderKastForm()}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddDestinationSheet;