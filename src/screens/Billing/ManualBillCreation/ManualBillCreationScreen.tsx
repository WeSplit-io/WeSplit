/**
 * Manual Bill Creation Screen
 * Allows users to manually create bills that integrate seamlessly with the OCR AI system
 * Uses the same data structures and processing logic as the OCR flow
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';  
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../../theme/colors';
import { useApp } from '../../../context/AppContext';
import { consolidatedBillAnalysisService, ManualBillInput } from '../../../services/billing';
import { ManualSplitCreationService } from '../../../services/billing';
import { BillAnalysisData } from '../../../types/billAnalysis';
import { convertFiatToUSDC } from '../../../services/core';
import { parseAmount } from '../../../utils/ui/format';
import { styles } from './styles';
import { logger } from '../../../services/analytics/loggingService';
import { Container, Modal as CustomModal, Header, Button } from '../../../components/shared';

// Category options with images
const CATEGORIES = [
  { id: 'trip', name: 'Trip', color: '#A5EA15', image: require('../../../../assets/trip-icon-black.png') },
  { id: 'food', name: 'Food', color: '#FFB800', image: require('../../../../assets/food-icon-black.png') },
  { id: 'home', name: 'Home', color: '#00BFA5', image: require('../../../../assets/house-icon-black.png') },
  { id: 'event', name: 'Event', color: '#FF6B35', image: require('../../../../assets/event-icon-black.png') },
  { id: 'rocket', name: 'Rocket', color: '#9C27B0', image: require('../../../../assets/rocket-icon-black.png') },
];

// Currency options
const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

interface ManualBillCreationScreenProps {
  navigation: any;
  route?: {
    params?: {
      onBillCreated?: (billData: any) => void;
      // Edit mode parameters
      isEditing?: boolean;
      existingBillData?: any;
      existingSplitId?: string;
      onBillUpdated?: (billData: any) => void;
    };
  };
}

const ManualBillCreationScreen: React.FC<ManualBillCreationScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;

  // Extract edit mode parameters
  const { 
    isEditing = false, 
    existingBillData, 
    existingSplitId, 
    onBillUpdated 
  } = route?.params || {};

  // Form state - initialize with existing data if editing
  const [selectedCategory, setSelectedCategory] = useState(
    isEditing && existingBillData?.category 
      ? existingBillData.category.toLowerCase()
      : 'trip'
  );
  const [billName, setBillName] = useState(
    isEditing && existingBillData?.title ? existingBillData.title : ''
  );
  const [selectedDate, setSelectedDate] = useState(
    isEditing && existingBillData?.date 
      ? new Date(existingBillData.date)
      : new Date()
  );
  const [amount, setAmount] = useState(
    isEditing && existingBillData?.totalAmount 
      ? existingBillData.totalAmount.toString()
      : ''
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    isEditing && existingBillData?.currency
      ? CURRENCIES.find(c => c.code === existingBillData.currency) || CURRENCIES[0]
      : CURRENCIES[0]
  );
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDateModified, setIsDateModified] = useState(false);
  const [initialDate, setInitialDate] = useState<Date | null>(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Convert amount to USDC when amount or currency changes
  useEffect(() => {
    const convertAmount = async () => {
      const numeric = amount ? parseAmount(amount) : 0;
      if (numeric > 0) {
        setIsConverting(true);
        try {
          const usdcAmount = await convertFiatToUSDC(
            numeric,
            selectedCurrency.code
          );
          setConvertedAmount(usdcAmount);
        } catch (error) {
          console.error('Error converting amount:', error);
          setConvertedAmount(null);
        } finally {
          setIsConverting(false);
        }
      } else {
        setConvertedAmount(null);
      }
    };

    convertAmount();
  }, [amount, selectedCurrency]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!billName.trim()) {
      errors.name = 'Please enter a bill name';
    }

    const numeric = amount ? parseAmount(amount) : 0;
    if (!amount || isNaN(numeric) || numeric <= 0) {
      errors.amount = 'Please enter a valid amount';
    }

    if (isConverting) {
      errors.amount = 'Amount conversion in progress, please wait';
    }

    if (!convertedAmount || convertedAmount <= 0) {
      errors.amount = 'Unable to convert amount to USDC';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear validation errors
  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
      // Comparer avec la date initiale pour détecter les vraies modifications
      if (initialDate && selectedDate.getTime() !== initialDate.getTime()) {
        setIsDateModified(true);
      }
    }
  };

  // Handle date picker close
  const handleDatePickerClose = () => {
    setShowDatePicker(false);
    setIsDateModified(false); // Réinitialiser l'état de modification
  };

  // Handle currency selection
  const handleCurrencySelect = (currency: typeof CURRENCIES[0]) => {
    setSelectedCurrency(currency);
    setShowCurrencyPicker(false);
    clearValidationErrors();
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    clearValidationErrors();
  };

  // Handle bill creation/update
  const handleCreateBill = async () => {
    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Check if amount conversion is still in progress
    if (isConverting) {
      Alert.alert('Please wait', 'Amount conversion is still in progress. Please wait a moment and try again.');
      return;
    }

    // Check if we have a converted amount
    if (!convertedAmount || convertedAmount <= 0) {
      Alert.alert('Conversion Error', 'Unable to convert amount to USDC. Please check your amount and try again.');
      return;
    }

    setIsCreating(true);

    try {
      logger.info('Starting bill creation process', {
        billName: billName.trim(),
        originalAmount: amount ? parseAmount(amount) : 0,
        originalCurrency: selectedCurrency.code,
        convertedAmount: convertedAmount,
        category: selectedCategory,
        selectedDate: selectedDate.toISOString()
      });

      // Create manual bill input data
      const manualBillInput: ManualBillInput = {
        category: CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Other',
        name: billName.trim(),
        amount: convertedAmount, // Use the converted USDC amount
        currency: 'USDC', // Always use USDC for the final amount
        date: selectedDate,
        location: '', // Could be enhanced with location input
        description: isEditing 
          ? `Manual bill updated on ${selectedDate.toLocaleDateString()}`
          : `Manual bill created on ${selectedDate.toLocaleDateString()} (${amount} ${selectedCurrency.code} converted to ${convertedAmount.toFixed(4)} USDC)`,
      };

      logger.info('Manual bill input created', { manualBillInput }, 'ManualBillCreationScreen');

      // Validate the manual input
      const validation = consolidatedBillAnalysisService.validateManualBillInput(manualBillInput);
      if (!validation.isValid) {
        console.error('❌ ManualBillCreationScreen: Validation failed:', validation.errors);
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Create the bill analysis data from manual input
      const manualBillData = await consolidatedBillAnalysisService.processManualBill(
        manualBillInput,
        currentUser
      );

      logger.info('Bill analysis data created', {
        storeName: manualBillData.merchant,
        totalAmount: manualBillData.totalAmount,
        currency: manualBillData.currency,
        category: manualBillData.title
      });

      // Process the manual bill data using the same processor as OCR
      const processedBillData = manualBillData;

      if (isEditing) {
        logger.info('Bill updated successfully', {
          title: processedBillData.title,
          totalAmount: processedBillData.totalAmount,
          currency: processedBillData.currency,
        });

        // Call the update callback if provided
        if (onBillUpdated) {
          onBillUpdated({
            ...processedBillData,
            existingSplitId,
            isUpdated: true,
          });
        }

        // Navigate back or to appropriate screen
        navigation.goBack();
      } else {
        logger.info('Bill processed successfully', {
          title: processedBillData.title,
          totalAmount: processedBillData.totalAmount,
          currency: processedBillData.currency,
          participantsCount: processedBillData.participants.length,
          itemsCount: processedBillData.items.length
        });

        // Create the split and wallet directly
        const splitCreationResult = await ManualSplitCreationService.createManualSplit({
          processedBillData,
          currentUser,
          billName: processedBillData.title,
          totalAmount: processedBillData.totalAmount.toString(),
          participants: processedBillData.participants,
          selectedSplitType: undefined // Let user choose in SplitDetails
        });

        if (!splitCreationResult.success) {
          throw new Error(splitCreationResult.error || 'Failed to create split');
        }

        logger.info('Split created successfully', {
          splitId: splitCreationResult.split?.id,
          title: splitCreationResult.split?.title
        });

        // Navigate to split details with the created split data
        navigation.navigate('SplitDetails', {
          splitData: splitCreationResult.split,
          splitId: splitCreationResult.split?.id,
          currentSplitData: splitCreationResult.split, // Pass as currentSplitData for proper loading
          billData: {
            title: processedBillData.title,
            totalAmount: processedBillData.totalAmount,
            currency: processedBillData.currency,
            merchant: processedBillData.merchant,
            date: processedBillData.date,
          },
          processedBillData: processedBillData,
          analysisResult: {
            success: true,
            data: manualBillData,
            processingTime: 0,
            confidence: 1.0,
            rawText: `Manual bill: ${billName} - ${amount} ${selectedCurrency.code} (${convertedAmount.toFixed(4)} USDC)`,
          },
          isNewBill: true, // This is a new bill/split
          isManualCreation: true, // This is a manual creation
        });
      }

    } catch (error) {
      console.error('❌ ManualBillCreationScreen: Error processing bill:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} bill: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsCreating(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <Header
        title={isEditing ? 'Edit Bill' : 'Create Bill'}
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />
     

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryButton}
                onPress={() => handleCategorySelect(category.id)}
              >
                {selectedCategory === category.id ? (
                  <LinearGradient
                    colors={[colors.green, colors.greenBlue]}
                    style={styles.categoryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Image
                      source={category.image}
                      style={styles.categoryIconSelected}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                ) : (
                  <Image
                    source={category.image}
                    style={styles.categoryIcon}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <TextInput
            style={[
              styles.textInput,
              validationErrors.name && styles.inputError,
            ]}
            value={billName}
            onChangeText={(text) => {
              setBillName(text);
              clearValidationErrors();
            }}
            placeholder="Expense Name"
            placeholderTextColor={colors.white70}
          />
          {validationErrors.name && (
            <Text style={styles.errorText}>{validationErrors.name}</Text>
          )}
        </View>

        {/* Date Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setInitialDate(selectedDate); // Enregistrer la date initiale
              setIsDateModified(false); // Réinitialiser l'état
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            <Image
              source={require('../../../../assets/calendar-icon.png')}
              style={styles.calendarIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={[
                styles.amountInput,
                validationErrors.amount && styles.inputError,
              ]}
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                clearValidationErrors();
              }}
              placeholder="0.00"
              placeholderTextColor={colors.white70}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={styles.currencyText}>
                {selectedCurrency.code} {selectedCurrency.symbol}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          </View>
          {validationErrors.amount && (
            <Text style={styles.errorText}>{validationErrors.amount}</Text>
          )}
        </View>

        {/* Total Display */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <View style={styles.totalValueContainer}>
            {isConverting ? (
              <ActivityIndicator size="small" color={colors.green} />
            ) : convertedAmount ? (
              <Text style={styles.totalValue}>
                {convertedAmount.toFixed(4)} USDC
              </Text>
            ) : (
              <Text style={styles.totalValuePlaceholder}>Calculating...</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton, 
            (isCreating || isConverting || !convertedAmount || convertedAmount <= 0) && styles.buttonDisabled
          ]}
          onPress={handleCreateBill}
          disabled={isCreating || isConverting || !convertedAmount || convertedAmount <= 0}
        >
          <LinearGradient
            colors={
              (isCreating || isConverting || !convertedAmount || convertedAmount <= 0) 
                ? [colors.surface, colors.surface] 
                : [colors.green, colors.greenBlue]
            }
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isCreating ? (
              <ActivityIndicator color={colors.black} />
            ) : isConverting ? (
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Converting...</Text>
            ) : !convertedAmount || convertedAmount <= 0 ? (
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Enter Amount</Text>
            ) : (
              <Text style={styles.buttonText}>{isEditing ? 'Update Bill' : 'Continue'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <CustomModal
        visible={showDatePicker}
        onClose={handleDatePickerClose}
        showHandle={true}
        closeOnBackdrop={true}
        title="Select Date"
        description="Choose the date for this bill"
      >
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            style={styles.datePicker}
            textColor={colors.white}
            themeVariant="dark"
          />
        </View>
        <Button
          title={`${isDateModified ? 'Done' : 'Select Date'}`}
          onPress={handleDatePickerClose}
          variant="primary"
          disabled={!isDateModified}
          fullWidth={true}
        />
      </CustomModal>

      {/* Currency Picker Modal */}
      <CustomModal
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        showHandle={true}
        closeOnBackdrop={true}
        title="Select Currency"
        description="Choose your preferred currency for this bill"
      >
        {CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency.code}
            style={[
              styles.currencyOption,
              selectedCurrency.code === currency.code && styles.currencyOptionSelected,
            ]}
            onPress={() => handleCurrencySelect(currency)}
          >
            <Text style={styles.currencyOptionText}>
              {currency.symbol} {currency.name} ({currency.code})
            </Text>
          </TouchableOpacity>
        ))}
      
      </CustomModal>
    </Container>
  );
};

export default ManualBillCreationScreen;
