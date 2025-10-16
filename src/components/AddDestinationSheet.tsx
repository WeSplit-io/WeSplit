import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { colors } from '../theme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { validateAddress, validateKastIdentifier } from '../utils/sendUtils';
import { styles } from './AddDestinationSheetStyles';

interface AddDestinationSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (destination: any) => void;
  isLoading?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [identifier, setIdentifier] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Animation refs
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      opacity.setValue(1);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) { // Threshold to close modal
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          handleClose();
          translateY.setValue(0);
          opacity.setValue(0);
        });
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animate in when modal becomes visible and reset form
  useEffect(() => {
    if (visible) {
      // Reset form when modal becomes visible
      resetForm();
      
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const resetForm = () => {
    setAddress('');
    setName('');
    setChain('solana');
    setIdentifier('');
    setErrors({});
    setDestinationType('wallet'); // Reset to default type
  };

  // Clear form fields when switching between wallet and KAST card types
  useEffect(() => {
    // Clear the fields that are not relevant to the current type
    if (destinationType === 'wallet') {
      setIdentifier('');
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

  const isFormValid = () => {
    if (isLoading) return false;
    if (!name.trim()) return false;
    
    if (destinationType === 'wallet') {
      return address.trim().length > 0;
    } else {
      return identifier.trim().length > 0;
    }
  };

  const handleSave = async () => {
    if (isLoading || !validateForm()) {
      return;
    }

    // For KAST cards, validate the card before saving
    if (destinationType === 'kast') {
      try {
        const { ExternalCardService } = await import('../services/ExternalCardService');
        
        // Validate card identifier
        const validation = await ExternalCardService.validateKastCard(identifier.trim());
        if (!validation.isValid) {
          setErrors({ identifier: validation.error || 'Invalid card identifier' });
          return;
        }

        // Get full card information
        const cardInfo = await ExternalCardService.getCardInfo(identifier.trim());
        if (!cardInfo.success || !cardInfo.card) {
          setErrors({ identifier: 'Failed to retrieve card information' });
          return;
        }

        // Create destination with full card information
        const destination = {
          type: destinationType,
          name: name.trim(),
          identifier: identifier.trim(),
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
        console.error('Error validating KAST card:', error);
        setErrors({ identifier: 'Failed to validate card. Please try again.' });
        return;
      }
    }

    // For regular wallets, use existing logic
    const destination = {
      type: destinationType,
      name: name.trim(),
      ...(destinationType === 'wallet' 
        ? { address: address.trim(), chain }
        : { identifier: identifier.trim() }
      )
    };

    onSaved(destination);
    // Reset form after successful save
    resetForm();
  };

  const renderWalletForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.inputLabel}>Wallet Address</Text>
      <TextInput
        style={styles.inputField}
        value={address}
        onChangeText={setAddress}
        placeholder="Enter wallet address"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

      <Text style={styles.inputLabel}>Name</Text>
      <TextInput
        style={styles.inputField}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Cold Wallet, Treasury"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
    </View>
  );

  const renderKastForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.inputLabel}>Card Address</Text>
      <TextInput
        style={styles.inputField}
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Enter card address"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors.identifier && <Text style={styles.errorText}>{errors.identifier}</Text>}

      <Text style={styles.inputLabel}>Name</Text>
      <TextInput
        style={styles.inputField}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Team Card, Marketing"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.modalOverlay, { opacity }]}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={handleClose}
          />
          
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                {/* Handle bar for slide down */}
                <View style={styles.grabHandle} />

                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Wallet or Card</Text>
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
                      Kast Card
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Form Content */}
                <View style={styles.formContent}>
                  {destinationType === 'wallet' ? (
                    <View>
                      <Text style={styles.inputLabel}>Wallet Address</Text>
                      <TextInput
                        style={styles.inputField}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Enter wallet address"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

                      <Text style={styles.inputLabel}>Name</Text>
                      <TextInput
                        style={styles.inputField}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Cold Wallet, Treasury"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.inputLabel}>Card Address</Text>
                      <TextInput
                        style={styles.inputField}
                        value={identifier}
                        onChangeText={setIdentifier}
                        placeholder="Enter card address"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {errors.identifier && <Text style={styles.errorText}>{errors.identifier}</Text>}

                      <Text style={styles.inputLabel}>Name</Text>
                      <TextInput
                        style={styles.inputField}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g., Team Card, Marketing"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      !isFormValid() && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!isFormValid()}
                  >
                    <Text style={[
                      styles.saveButtonText,
                      !isFormValid() && styles.saveButtonTextDisabled
                    ]}>
                      {isLoading ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </Animated.View>
    </Modal>
  );
};

export default AddDestinationSheet;