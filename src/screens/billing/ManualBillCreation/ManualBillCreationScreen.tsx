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
  ActivityIndicator,
  Image,
} from 'react-native';  
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../../theme/colors';
import { useApp } from '../../../context/AppContext';
import { consolidatedBillAnalysisService, ManualBillInput } from '../../../services/billing';
// ManualSplitCreationService removed - split creation now handled in SplitDetailsScreen for consistency
import { BillAnalysisData, ProcessedBillData, BillAnalysisResult } from '../../../types/billAnalysis';
import { convertFiatToUSDC } from '../../../services/core';
import { parseAmount } from '../../../utils/ui/format';
import { styles } from './styles';
import { logger } from '../../../services/analytics/loggingService';
import { Container, Modal, Header, Button, Input, PhosphorIcon } from '../../../components/shared';
import { 
  createSplitDetailsNavigationParams, 
  validateProcessedBillDataForNavigation 
} from '../../../utils/navigation/splitNavigationHelpers';

// Category options with images - using Phosphor icons
const CATEGORIES = [
  { id: 'trip', name: 'Trip', color: '#A5EA15', image: 'Suitcase', isPhosphor: true },
  { id: 'food', name: 'Food', color: '#FFB800', image: 'Coffee', isPhosphor: true },
  { id: 'home', name: 'Home', color: '#00BFA5', image: 'House', isPhosphor: true },
  { id: 'event', name: 'Event', color: '#FF6B35', image: 'Calendar', isPhosphor: true },
  { id: 'rocket', name: 'Rocket', color: '#9C27B0', image: 'Rocket', isPhosphor: true },
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
      existingBillData?: ProcessedBillData; // Bill data to edit
      existingSplitId?: string; // Split ID to update
      existingSplitData?: any; // Full split data for editing
      onBillUpdated?: (billData: any) => void; // Callback for updates
      // OCR data parameters
      ocrData?: ProcessedBillData; // Pre-filled data from OCR
      isFromOCR?: boolean; // Whether this screen was opened from OCR flow
      imageUri?: string; // Original image URI from OCR
      ocrError?: string; // Error message if OCR failed
      analysisResult?: BillAnalysisResult; // Full OCR analysis result
    };
  };
}

const ManualBillCreationScreen: React.FC<ManualBillCreationScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;

  // Extract parameters
  const { 
    isEditing = false, 
    existingBillData, 
    existingSplitId, 
    existingSplitData,
    onBillUpdated,
    ocrData,
    isFromOCR = false,
    ocrError,
    analysisResult
  } = route?.params || {};

  // Determine initial values - priority: OCR data > existing data > defaults
  const getInitialCategory = () => {
    // Use OCR-provided category if available
    if (ocrData?.ocrCategory) {
      return ocrData.ocrCategory;
    }
    if (isEditing && existingBillData?.category) {
      return existingBillData.category.toLowerCase();
    }
    return 'trip'; // Default
  };

  const getInitialBillName = () => {
    if (ocrData?.title) return ocrData.title;
    if (isEditing && existingBillData?.title) return existingBillData.title;
    return '';
  };

  const getInitialDate = () => {
    if (ocrData?.date) return new Date(ocrData.date);
    if (isEditing && existingBillData?.date) return new Date(existingBillData.date);
    return new Date();
  };

  const getInitialAmount = () => {
    // OCR data is already in USDC, so we need to show it differently
    if (ocrData?.totalAmount) {
      // OCR data is in USDC, show as USDC amount
      return ocrData.totalAmount.toString();
    }
    if (isEditing && existingBillData?.totalAmount) {
      return existingBillData.totalAmount.toString();
    }
    return '';
  };

  const getInitialCurrency = () => {
    // OCR data is always in USDC, show as USD (closest equivalent)
    if (ocrData?.currency === 'USDC') {
      return CURRENCIES.find(c => c.code === 'USD') || CURRENCIES[0];
    }
    if (isEditing && existingBillData?.currency) {
      // Map USDC to USD for display
      const currencyCode = existingBillData.currency === 'USDC' ? 'USD' : existingBillData.currency;
      return CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
    }
    return CURRENCIES[0];
  };

  // Form state - initialize with OCR data, existing data, or defaults
  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory());
  const [billName, setBillName] = useState(getInitialBillName());
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [amount, setAmount] = useState(getInitialAmount());
  const [selectedCurrency, setSelectedCurrency] = useState(getInitialCurrency());
  
  // If OCR data is in USDC, set converted amount immediately
  const [convertedAmount, setConvertedAmount] = useState<number | null>(
    ocrData?.currency === 'USDC' ? ocrData.totalAmount : null
  );
  const [isConverting, setIsConverting] = useState(false);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDateModified, setIsDateModified] = useState(false);
  const [initialDate, setInitialDate] = useState<Date | null>(null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Show OCR error message if OCR failed
  useEffect(() => {
    if (isFromOCR && ocrError) {
      Alert.alert(
        'OCR Analysis Failed',
        `${ocrError}\n\nYou can manually enter the bill details below.`,
        [{ text: 'OK' }]
      );
    }
  }, [isFromOCR, ocrError]);

  // Convert amount to USDC when amount or currency changes
  // Skip conversion if OCR data is already in USDC
  useEffect(() => {
    // If OCR data is in USDC and amount matches, don't convert again
    if (ocrData?.currency === 'USDC' && ocrData.totalAmount && amount === ocrData.totalAmount.toString()) {
      return;
    }

    const convertAmount = async () => {
      const numeric = amount ? parseAmount(amount) : 0;
      if (numeric > 0) {
        setIsConverting(true);
        try {
          // Use live market rates - throws error if conversion fails
          const usdcAmount = await convertFiatToUSDC(
            numeric,
            selectedCurrency.code
          );
          
          // Validate the converted amount
          if (!usdcAmount || isNaN(usdcAmount) || usdcAmount <= 0) {
            throw new Error('Invalid conversion result');
          }
          
          setConvertedAmount(usdcAmount);
          clearValidationErrors();
          
          logger.info('Amount converted successfully', {
            originalAmount: numeric,
            originalCurrency: selectedCurrency.code,
            convertedAmount: usdcAmount,
            currency: 'USDC'
          }, 'ManualBillCreationScreen');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
          console.error('Error converting amount:', error);
          logger.error('Currency conversion failed', {
            amount: numeric,
            currency: selectedCurrency.code,
            error: errorMessage
          }, 'ManualBillCreationScreen');
          
          setConvertedAmount(null);
          setValidationErrors({
            amount: `Failed to convert ${selectedCurrency.code} to USDC. ${errorMessage}. Please check your internet connection and try again.`
          });
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

    // Check if we have a converted amount from live market rates
    if (!convertedAmount || convertedAmount <= 0) {
      Alert.alert(
        'Conversion Error', 
        'Unable to convert amount to USDC using live market rates. Please check your internet connection and try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear validation errors to allow user to retry
              clearValidationErrors();
            }
          }
        ]
      );
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
        location: ocrData?.location || '', // Preserve OCR location if available
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

      // CRITICAL FIX: If OCR data exists, merge user edits with OCR data
      // This preserves OCR-extracted items, merchant, location, subtotal, tax
      let processedBillData: ProcessedBillData;
      
      if (ocrData && isFromOCR) {
        // Merge OCR data with user edits - preserve OCR items/merchant/location
        logger.info('Merging OCR data with user edits', {
          ocrItemsCount: ocrData.items?.length || 0,
          ocrMerchant: ocrData.merchant,
          ocrLocation: ocrData.location,
          userEditedName: billName.trim(),
          userEditedAmount: convertedAmount,
          userEditedDate: selectedDate.toISOString().split('T')[0]
        }, 'ManualBillCreationScreen');

        processedBillData = {
          ...ocrData, // Preserve all OCR data: items, merchant, location, subtotal, tax, time, participants
          // Allow user to edit these fields:
          title: billName.trim() || ocrData.title,
          totalAmount: convertedAmount || ocrData.totalAmount,
          date: selectedDate.toISOString().split('T')[0] || ocrData.date,
          // If user changed amount significantly, we might need to adjust item prices proportionally
          // For now, keep OCR items as-is (user can review in SplitDetails)
        };

        // If user changed the total amount significantly, warn them
        if (ocrData.totalAmount && convertedAmount && 
            Math.abs(convertedAmount - ocrData.totalAmount) > 0.01) {
          logger.info('User edited total amount', {
            originalOCR: ocrData.totalAmount,
            newAmount: convertedAmount,
            difference: convertedAmount - ocrData.totalAmount
          }, 'ManualBillCreationScreen');
          // Note: Items keep their OCR prices - user can adjust in SplitDetails if needed
        }
      } else {
        // Manual entry (no OCR data): create new data from form
      const manualBillData = await consolidatedBillAnalysisService.processManualBill(
        manualBillInput,
        currentUser
      );

        logger.info('Bill analysis data created from manual input', {
        storeName: manualBillData.merchant,
        totalAmount: manualBillData.totalAmount,
        currency: manualBillData.currency,
        category: manualBillData.title
        }, 'ManualBillCreationScreen');

        processedBillData = manualBillData;
      }

      if (isEditing && existingSplitId) {
        // Update existing split in the database
        logger.info('Updating existing split', {
          splitId: existingSplitId,
          title: processedBillData.title,
          totalAmount: processedBillData.totalAmount,
        }, 'ManualBillCreationScreen');

        const updatedSplitData = {
          billId: processedBillData.id,
          title: processedBillData.title,
          description: `Split for ${processedBillData.title}`,
          totalAmount: processedBillData.totalAmount,
          currency: processedBillData.currency,
          splitType: existingSplitData?.splitType || 'fair',
          status: existingSplitData?.status || 'draft',
          creatorId: currentUser?.id?.toString() || '',
          creatorName: currentUser?.name || 'Unknown',
          participants: existingSplitData?.participants || [], // Keep existing participants
          items: processedBillData.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            category: item.category || 'Other',
            participants: item.participants || [],
          })),
          merchant: {
            name: processedBillData.merchant,
            address: processedBillData.location || '',
            phone: processedBillData.merchantPhone || '',
          },
          date: processedBillData.date,
          // OCR-extracted data
          subtotal: processedBillData.subtotal,
          tax: processedBillData.tax,
          receiptNumber: processedBillData.receiptNumber,
          updatedAt: new Date().toISOString(),
        };

        const updateResult = await SplitStorageService.updateSplit(existingSplitId, updatedSplitData);

        if (updateResult.success) {
          logger.info('Split updated successfully', {
            splitId: existingSplitId,
            title: processedBillData.title,
          }, 'ManualBillCreationScreen');

        // Call the update callback if provided
        if (onBillUpdated) {
          onBillUpdated({
            ...processedBillData,
            existingSplitId,
            isUpdated: true,
          });
        }

          // Navigate back to SplitDetails with updated data
          navigation.replace('SplitDetails', {
            splitId: existingSplitId,
            splitData: updateResult.split,
            currentSplitData: updateResult.split,
            billData: {
              id: processedBillData.id,
              title: processedBillData.title,
              totalAmount: processedBillData.totalAmount,
              currency: processedBillData.currency,
              date: processedBillData.date,
              merchant: processedBillData.merchant,
              items: processedBillData.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
                participants: item.participants || [],
              })),
              participants: processedBillData.participants.map(p => ({
                id: p.id,
                name: p.name,
                walletAddress: p.walletAddress || p.wallet_address || '',
                status: p.status,
                amountOwed: p.amountOwed || 0,
                items: p.items || [],
              })),
              settings: processedBillData.settings,
            },
            processedBillData: processedBillData,
          });
        } else {
          throw new Error(updateResult.error || 'Failed to update split');
        }
      } else {
        logger.info('Bill processed successfully', {
          title: processedBillData.title,
          totalAmount: processedBillData.totalAmount,
          currency: processedBillData.currency,
          participantsCount: processedBillData.participants.length,
          itemsCount: processedBillData.items.length
        });

        // Validate processed bill data before navigation
        const validation = validateProcessedBillDataForNavigation(processedBillData);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid bill data');
        }

        // Navigate to SplitDetails with processedBillData - let SplitDetails handle split creation
        // This ensures consistent flow with OCR and prevents duplicate split creation
        // Split will be created when user selects split type in SplitDetailsScreen
        // Only pass essential data to optimize performance
        const navigationParams = createSplitDetailsNavigationParams(processedBillData, {
          analysisResult: {
            success: true,
            confidence: 1.0,
            processingTime: 0,
          },
          isManualCreation: true,
        });

        if (__DEV__) {
          logger.debug('Navigating to SplitDetails for manual bill', {
            title: processedBillData.title,
            totalAmount: processedBillData.totalAmount,
            participantsCount: processedBillData.participants?.length || 0,
            isNewBill: navigationParams.isNewBill,
            isManualCreation: navigationParams.isManualCreation
          }, 'ManualBillCreationScreen');
        }

        // Use replace to prevent screen stacking and ensure clean navigation state
        navigation.replace('SplitDetails', navigationParams);
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
        title={
          isFromOCR 
            ? (ocrData ? 'Review OCR Bill' : 'Create Bill (OCR Failed)')
            : (isEditing ? 'Edit Bill' : 'Create Bill')
        }
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />
      
      {/* OCR Success Indicator */}
      {isFromOCR && ocrData && (
        <View style={styles.ocrSuccessBanner}>
          <Text style={styles.ocrSuccessText}>
            ✓ OCR data extracted successfully. Please review and edit if needed.
          </Text>
        </View>
      )}

      {/* Low Confidence Warning */}
      {isFromOCR && analysisResult && analysisResult.confidence !== undefined && analysisResult.confidence < 0.7 && (
        <View style={styles.confidenceWarningBanner}>
          <Text style={styles.confidenceWarningText}>
            ⚠️ Low confidence ({Math.round(analysisResult.confidence * 100)}%). Please verify all extracted data carefully.
          </Text>
        </View>
      )}

      {/* Validation Warnings */}
      {ocrData?.validationWarnings && (
        <View style={styles.validationWarningBanner}>
          <Text style={styles.validationWarningTitle}>⚠️ Data Validation Warnings:</Text>
          {ocrData.validationWarnings.itemsSumMismatch && (
            <Text style={styles.validationWarningText}>
              • Items sum doesn't match total amount. Please verify item prices.
            </Text>
          )}
          {ocrData.validationWarnings.subtotalTaxMismatch && (
            <Text style={styles.validationWarningText}>
              • Subtotal + tax doesn't match total. Please verify amounts.
            </Text>
          )}
        </View>
      )}
     

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
                    {category.isPhosphor ? (
                      <PhosphorIcon
                        name={category.image as any}
                        size={32}
                        color={colors.white}
                        style={styles.categoryIconSelected}
                      />
                    ) : (
                      <Image
                        source={category.image}
                        style={styles.categoryIconSelected}
                        resizeMode="contain"
                      />
                    )}
                  </LinearGradient>
                ) : (
                  category.isPhosphor ? (
                    <PhosphorIcon
                      name={category.image as any}
                      size={32}
                      color={colors.white70}
                      style={styles.categoryIcon}
                    />
                  ) : (
                    <Image
                      source={category.image}
                      style={styles.categoryIcon}
                      resizeMode="contain"
                    />
                  )
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name Input */}
        <Input
          label="Name"
          value={billName}
          onChangeText={(text) => {
            setBillName(text);
            clearValidationErrors();
          }}
          placeholder="Expense Name"
          error={validationErrors.name}
        />

        {/* Date Input */}
        <Input
          label="Date"
          value={formatDate(selectedDate)}
          placeholder="Select Date"
          rightIcon="Calendar"
          onRightIconPress={() => {
            setInitialDate(selectedDate); // Enregistrer la date initiale
            setIsDateModified(false); // Réinitialiser l'état
            setShowDatePicker(true);
          }}
          editable={false}
        />

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Input
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  clearValidationErrors();
                }}
                placeholder="0.00"
                keyboardType="numeric"
                error={validationErrors.amount}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={styles.currencyText}>
                {selectedCurrency.code} {selectedCurrency.symbol}
              </Text>
              <PhosphorIcon name="CaretDown" size={16} color={colors.white50} />
            </TouchableOpacity>
          </View>
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
              <Text style={styles.totalValuePlaceholder}>0.00 USDC</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={
            isCreating ? 'Creating...' :
            isConverting ? 'Converting...' :
            !convertedAmount || convertedAmount <= 0 ? 'Enter Amount' :
            isEditing ? 'Update Bill' : 'Continue'
          }
          onPress={handleCreateBill}
          disabled={isCreating || isConverting || !convertedAmount || convertedAmount <= 0}
          loading={isCreating}
          fullWidth={true}
          style={styles.continueButton}
        />
      </View>

      {/* Date Picker Modal */}
      <Modal
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
      </Modal>

      {/* Currency Picker Modal */}
      <Modal
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
      
      </Modal>
    </Container>
  );
};

export default ManualBillCreationScreen;
