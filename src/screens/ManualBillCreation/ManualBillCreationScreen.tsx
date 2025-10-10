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
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useApp } from '../../context/AppContext';
import { ManualBillDataProcessor, ManualBillInput } from '../../services/manualBillDataProcessor';
import { BillAnalysisData } from '../../types/billAnalysis';
import { convertFiatToUSDC } from '../../services/fiatCurrencyService';

// Category options with text labels
const CATEGORIES = [
  { id: 'trip', name: 'Trip', color: '#A5EA15' },
  { id: 'food', name: 'Food', color: '#FFB800' },
  { id: 'home', name: 'Home', color: '#00BFA5' },
  { id: 'event', name: 'Event', color: '#FF6B35' },
  { id: 'rocket', name: 'Rocket', color: '#9C27B0' },
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
    };
  };
}

const ManualBillCreationScreen: React.FC<ManualBillCreationScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;

  // Form state
  const [selectedCategory, setSelectedCategory] = useState('trip');
  const [billName, setBillName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear validation errors
  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
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

  // Handle bill creation
  const handleCreateBill = async () => {
    if (!validateForm()) {
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsCreating(true);

    try {
      // Create manual bill input data
      const manualBillInput: ManualBillInput = {
        category: CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Other',
        name: billName.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.code,
        date: selectedDate,
        location: '', // Could be enhanced with location input
        description: `Manual bill created on ${selectedDate.toLocaleDateString()}`,
      };

      // Validate the manual input
      const validation = ManualBillDataProcessor.validateManualInput(manualBillInput);
      if (!validation.isValid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Create the bill analysis data from manual input
      const manualBillData = ManualBillDataProcessor.createManualBillData(
        manualBillInput,
        currentUser
      );

      // Process the manual bill data using the same processor as OCR
      const processedBillData = ManualBillDataProcessor.processManualBillData(
        manualBillData,
        currentUser
      );

      console.log('✅ ManualBillCreationScreen: Bill created successfully:', {
        title: processedBillData.title,
        totalAmount: processedBillData.totalAmount,
        currency: processedBillData.currency,
      });

      // Navigate to split details with the processed data
      navigation.navigate('SplitDetails', {
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
          rawText: `Manual bill: ${billName} - ${amount} ${selectedCurrency.code}`,
        },
        isNewBill: true,
        isManualCreation: true,
      });

    } catch (error) {
      console.error('❌ ManualBillCreationScreen: Error creating bill:', error);
      Alert.alert('Error', 'Failed to create bill. Please try again.');
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
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Create Bill</Text>
        
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
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && {
                    backgroundColor: category.color,
                  },
                ]}
                onPress={() => handleCategorySelect(category.id)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextSelected
                ]}>
                  {category.name}
                </Text>
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
            placeholderTextColor={colors.textSecondary}
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
            <Text style={styles.calendarIcon}>📅</Text>
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
              placeholderTextColor={colors.textSecondary}
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
          style={[styles.continueButton, isCreating && styles.buttonDisabled]}
          onPress={handleCreateBill}
          disabled={isCreating}
        >
          <LinearGradient
            colors={[colors.green, colors.greenBlue]}
            style={styles.buttonGradient}
          >
            {isCreating ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.white,
  },
  title: {
    ...typography.textStyles.navTitle,
    color: colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionLabel: {
    ...typography.textStyles.label,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoryButton: {
    flex: 1,
    height: spacing.buttonHeight,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  categoryText: {
    ...typography.textStyles.buttonSmall,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: colors.white,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    color: colors.white,
    ...typography.textStyles.body,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    height: spacing.inputHeight,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    ...typography.textStyles.caption,
    marginTop: spacing.xs,
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    height: spacing.inputHeight,
  },
  dateText: {
    color: colors.white,
    ...typography.textStyles.body,
  },
  calendarIcon: {
    fontSize: spacing.iconSizeSmall,
    color: colors.textLightSecondary,
  },
  amountContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    color: colors.white,
    ...typography.textStyles.body,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    height: spacing.inputHeight,
  },
  currencyButton: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    minWidth: 100,
    height: spacing.inputHeight,
  },
  currencyText: {
    color: colors.white,
    ...typography.textStyles.body,
    marginRight: spacing.xs,
  },
  dropdownIcon: {
    color: colors.textLightSecondary,
    fontSize: spacing.iconSizeSmall,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: spacing.borderWidthThin,
    borderTopColor: colors.border,
  },
  totalLabel: {
    ...typography.textStyles.label,
    color: colors.white,
  },
  totalValueContainer: {
    alignItems: 'flex-end',
  },
  totalValue: {
    ...typography.textStyles.amountMedium,
    color: colors.green,
  },
  totalValuePlaceholder: {
    ...typography.textStyles.body,
    color: colors.textLightSecondary,
  },
  buttonContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  continueButton: {
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: spacing.buttonPaddingVertical,
    alignItems: 'center',
    justifyContent: 'center',
    height: spacing.buttonHeight,
  },
  buttonText: {
    ...typography.textStyles.button,
    color: colors.black,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.blackOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.textStyles.h6,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  currencyOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.radiusSm,
    marginBottom: spacing.sm,
  },
  currencyOptionSelected: {
    backgroundColor: colors.green + '20',
  },
  currencyOptionText: {
    ...typography.textStyles.body,
    color: colors.white,
  },
  modalCloseButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalCloseText: {
    ...typography.textStyles.body,
    color: colors.textLightSecondary,
  },
});

export default ManualBillCreationScreen;
