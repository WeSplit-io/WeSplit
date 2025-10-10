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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';
import { ManualBillDataProcessor, ManualBillInput } from '../../services/manualBillDataProcessor';
import { ManualSplitCreationService } from '../../services/manualSplitCreationService';
import { BillAnalysisData } from '../../types/billAnalysis';
import { convertFiatToUSDC } from '../../services/fiatCurrencyService';
import { styles } from './styles';

// Category options with images
const CATEGORIES = [
  { id: 'trip', name: 'Trip', color: '#A5EA15', image: require('../../../assets/trip-icon-black.png') },
  { id: 'food', name: 'Food', color: '#FFB800', image: require('../../../assets/food-icon-black.png') },
  { id: 'home', name: 'Home', color: '#00BFA5', image: require('../../../assets/house-icon-black.png') },
  { id: 'event', name: 'Event', color: '#FF6B35', image: require('../../../assets/event-icon-black.png') },
  { id: 'rocket', name: 'Rocket', color: '#9C27B0', image: require('../../../assets/rocket-icon-black.png') },
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

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Convert amount to USDC when amount or currency changes
  useEffect(() => {
    const convertAmount = async () => {
      if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
        setIsConverting(true);
        try {
          const usdcAmount = await convertFiatToUSDC(
            parseFloat(amount),
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

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
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
    }
  };

  // Handle date picker close
  const handleDatePickerClose = () => {
    setShowDatePicker(false);
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
      console.log('🔄 ManualBillCreationScreen: Starting bill creation process:', {
        billName: billName.trim(),
        originalAmount: parseFloat(amount),
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

      console.log('🔄 ManualBillCreationScreen: Manual bill input created:', manualBillInput);

      // Validate the manual input
      const validation = ManualBillDataProcessor.validateManualInput(manualBillInput);
      if (!validation.isValid) {
        console.error('❌ ManualBillCreationScreen: Validation failed:', validation.errors);
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Create the bill analysis data from manual input
      const manualBillData = ManualBillDataProcessor.createManualBillData(
        manualBillInput,
        currentUser
      );

      console.log('🔄 ManualBillCreationScreen: Bill analysis data created:', {
        storeName: manualBillData.store.name,
        totalAmount: manualBillData.transaction.order_total,
        currency: manualBillData.currency,
        category: manualBillData.category
      });

      // Process the manual bill data using the same processor as OCR
      const processedBillData = ManualBillDataProcessor.processManualBillData(
        manualBillData,
        currentUser
      );

      if (isEditing) {
        console.log('✅ ManualBillCreationScreen: Bill updated successfully:', {
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
        console.log('✅ ManualBillCreationScreen: Bill processed successfully:', {
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

        console.log('✅ ManualBillCreationScreen: Split created successfully:', {
          splitId: splitCreationResult.split?.id,
          title: splitCreationResult.split?.title
        });

        // Navigate to split details with the created split data
        navigation.navigate('SplitDetails', {
          splitData: splitCreationResult.split,
          splitId: splitCreationResult.split?.id,
          splitWallet: splitCreationResult.splitWallet, // Pass the wallet information
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
          isNewBill: false, // Not a new bill since we already created the split
          isManualCreation: false, // Not manual creation since we already processed it
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
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../../assets/chevron-left.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <Text style={styles.title}>{isEditing ? 'Edit Bill' : 'Create Bill'}</Text>
        
        <View style={styles.headerSpacer} />
      </View>

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
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            <Image
              source={require('../../../assets/calendar-icon.png')}
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
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDatePickerClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={handleDatePickerClose}
                style={styles.datePickerCloseButton}
              >
                <Text style={styles.datePickerCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
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
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
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
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCurrencyPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ManualBillCreationScreen;
