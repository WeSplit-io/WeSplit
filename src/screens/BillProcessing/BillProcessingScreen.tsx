/**
 * Bill Processing Screen
 * Handles OCR processing of bill images and displays results
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './BillProcessingStyles';
import { BillItem, OCRProcessingResult, BillSplitCreationData } from '../../types/billSplitting';
import { BillAnalysisData, BillAnalysisResult, ProcessedBillData } from '../../types/billAnalysis';
import { BillAnalysisService } from '../../services/billAnalysisService';
import { MockBillAnalysisService } from '../../services/mockBillAnalysisService';
import { billOCRService } from '../../services/billOCRService';
import { useApp } from '../../context/AppContext';
import { SplitStorageService } from '../../services/splitStorageService';

interface RouteParams {
  imageUri: string;
  billData?: Partial<BillSplitCreationData>;
  processedBillData?: ProcessedBillData;
  analysisResult?: BillAnalysisResult;
  isEditing?: boolean;
  existingSplitId?: string; // ID of existing split to update
  existingSplitData?: any; // Existing split data to update
}

interface BillProcessingScreenProps {
  navigation: any;
}

const BillProcessingScreen: React.FC<BillProcessingScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { imageUri, billData, processedBillData, analysisResult, isEditing, existingSplitId, existingSplitData } = route.params as RouteParams;
  const { state } = useApp();
  const { currentUser } = state;
  
  const [isProcessing, setIsProcessing] = useState(!isEditing);
  const [processingResult, setProcessingResult] = useState<BillAnalysisResult | null>(analysisResult || null);
  const [currentProcessedBillData, setCurrentProcessedBillData] = useState<ProcessedBillData | null>(processedBillData || null);
  const [extractedItems, setExtractedItems] = useState<BillItem[]>(
    isEditing && processedBillData ? 
      processedBillData.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        participants: item.participants,
      })) : 
      []
  );
  const [totalAmount, setTotalAmount] = useState(
    isEditing && existingSplitData ? existingSplitData.totalAmount :
    isEditing && processedBillData ? processedBillData.totalAmount : 0
  );
  const [merchant, setMerchant] = useState(
    isEditing && existingSplitData ? existingSplitData.merchant?.name || '' :
    isEditing && processedBillData ? processedBillData.merchant : ''
  );
  const [date, setDate] = useState(
    isEditing && existingSplitData ? existingSplitData.date :
    isEditing && processedBillData ? processedBillData.date : new Date().toISOString().split('T')[0]
  );
  
  // New state for the redesigned form
  const [selectedCategory, setSelectedCategory] = useState('restaurant');
  const [billName, setBillName] = useState(
    isEditing && existingSplitData ? existingSplitData.title : 
    isEditing && processedBillData ? processedBillData.title : 'Restaurant Night'
  );
  const [amount, setAmount] = useState(
    isEditing && existingSplitData ? existingSplitData.totalAmount.toString() :
    isEditing && processedBillData ? processedBillData.totalAmount.toString() : '61.95'
  );
  const [currency, setCurrency] = useState('EUR');
  const [convertedAmount, setConvertedAmount] = useState('65.6');

  // Category options with icons
  const categories = [
    { id: 'restaurant', icon: 'RES', name: 'Restaurant' },
    { id: 'travel', icon: 'TVL', name: 'Travel' },
    { id: 'home', icon: 'HOM', name: 'Home' },
    { id: 'entertainment', icon: 'ENT', name: 'Entertainment' },
    { id: 'shopping', icon: 'SHP', name: 'Shopping' },
  ];

  useEffect(() => {
    if (!isEditing) {
      processBillImage();
    }
  }, [isEditing]);

  const processBillImage = async () => {
    setIsProcessing(true);
    
    try {
      // Use mock service to simulate your Python OCR service
      // Replace this with actual API call to your Python service
      const analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
      
      setProcessingResult(analysisResult);
      
      if (analysisResult.success && analysisResult.data) {
        // Process the structured data with current user information
        const processedData = BillAnalysisService.processBillData(analysisResult.data, currentUser || undefined);
        setCurrentProcessedBillData(processedData);
      
        // Set the authoritative price in the price management service immediately
        const { priceManagementService } = await import('../../services/priceManagementService');
        priceManagementService.setBillPrice(
          processedData.id,
          processedData.totalAmount,
          processedData.currency || 'USDC'
        );
        
        console.log('💰 BillProcessingScreen: Set authoritative price:', {
          billId: processedData.id,
          totalAmount: processedData.totalAmount,
          currency: processedData.currency || 'USDC'
        });
      
        // Update legacy state for backward compatibility
        setExtractedItems(processedData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          participants: item.participants,
        })));
        setTotalAmount(processedData.totalAmount);
        setMerchant(processedData.merchant);
        setDate(processedData.date);
      } else {
        Alert.alert('Processing Failed', analysisResult.error || 'Failed to process bill image');
      }
      
    } catch (error) {
      console.error('Error processing bill:', error);
      const errorResult: BillAnalysisResult = {
        success: false,
        error: 'Failed to process bill image. Please try again.',
        processingTime: 0,
        confidence: 0,
      };
      setProcessingResult(errorResult);
      Alert.alert('Error', 'Failed to process bill image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  const extractMerchantName = (rawText: string): string => {
    // Simple merchant extraction - replace with more sophisticated logic
    const lines = rawText.split('\n');
    const firstLine = lines[0]?.trim();
    return firstLine || 'Unknown Merchant';
  };

  const addItem = () => {
    const newItem: BillItem = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      quantity: 1,
      category: 'Other',
      participants: [],
    };
    setExtractedItems([...extractedItems, newItem]);
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setExtractedItems(items =>
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setExtractedItems(items => items.filter(item => item.id !== id));
  };

  const recalculateTotal = () => {
    const newTotal = extractedItems.reduce(
      (sum, item) => sum + (item.price * (item.quantity || 1)),
      0
    );
    setTotalAmount(newTotal);
  };

  const proceedToSplitDetails = async () => {
    // If in edit mode, use existing processed data or create new one
    let currentProcessedData = currentProcessedBillData;
    
    if (!currentProcessedData) {
      // Create processed data from current state
      const billId = existingSplitData?.billId || `split_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
       currentProcessedData = {
         id: billId,
         title: billName,
         merchant: merchant || 'Restaurant',
         location: '',
         date: date,
         time: new Date().toLocaleTimeString(),
         currency: 'USDC',
         totalAmount: parseFloat(convertedAmount),
         subtotal: parseFloat(convertedAmount) * 0.9, // Estimate
         tax: parseFloat(convertedAmount) * 0.1, // Estimate
        items: extractedItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          category: item.category || 'Other',
          participants: item.participants,
          isSelected: true,
        })),
        participants: [],
        settings: {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal' as const,
          taxIncluded: true,
        },
        originalAnalysis: {} as BillAnalysisData,
      };
    }

    // Validate the processed data
    if (currentProcessedData) {
      const validation = BillAnalysisService.validateBillData(currentProcessedData);
      if (!validation.isValid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }
    }

    // If editing an existing split, update it in the database
    if (isEditing && existingSplitId && currentUser && currentProcessedData) {
      try {
        console.log('🔍 BillProcessingScreen: Updating existing split:', existingSplitId);
        
        const updatedSplitData = {
          billId: currentProcessedData.id,
          title: currentProcessedData.title,
          description: `Split for ${currentProcessedData.title}`,
          totalAmount: currentProcessedData.totalAmount,
          currency: currentProcessedData.currency,
          splitType: existingSplitData?.splitType || 'fair',
          status: existingSplitData?.status || 'draft',
          creatorId: currentUser.id.toString(),
          creatorName: currentUser.name,
          participants: existingSplitData?.participants || [], // Keep existing participants
          items: currentProcessedData.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category,
            participants: item.participants,
          })),
          merchant: {
            name: currentProcessedData.merchant,
            address: currentProcessedData.location,
            phone: '(415) 555-0123',
          },
          date: currentProcessedData.date,
          updatedAt: new Date().toISOString(),
        };

        const updateResult = await SplitStorageService.updateSplit(existingSplitId, updatedSplitData);
        
        if (updateResult.success) {
          console.log('🔍 BillProcessingScreen: Split updated successfully');
          
          // Navigate back to SplitDetails with updated data
          navigation.navigate('SplitDetails', { 
            billData: {
              title: currentProcessedData.title,
              totalAmount: currentProcessedData.totalAmount,
              currency: currentProcessedData.currency,
              date: currentProcessedData.date,
              merchant: currentProcessedData.merchant,
              billImageUrl: imageUri,
              items: currentProcessedData.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
                participants: item.participants,
              })),
              participants: currentProcessedData.participants.map(p => ({
                id: p.id,
                name: p.name,
                walletAddress: p.walletAddress,
                status: p.status,
                amountOwed: p.amountOwed,
                items: p.items,
              })),
              settings: currentProcessedData.settings,
            },
            processedBillData: currentProcessedData,
            analysisResult: processingResult,
            splitData: updateResult.split, // Pass the updated split data
            splitId: existingSplitId, // FIXED: Pass the splitId to prevent duplicate creation
          });
        } else {
          console.log('🔍 BillProcessingScreen: Failed to update split:', updateResult.error);
          Alert.alert('Error', updateResult.error || 'Failed to update split');
        }
      } catch (error) {
        console.error('🔍 BillProcessingScreen: Error updating split:', error);
        Alert.alert('Error', 'Failed to update split');
      }
      return;
    }

    // Convert to legacy format for backward compatibility
    if (currentProcessedData) {
      const billData: BillSplitCreationData = {
        title: currentProcessedData.title,
        totalAmount: currentProcessedData.totalAmount,
        currency: currentProcessedData.currency,
        date: currentProcessedData.date,
        merchant: currentProcessedData.merchant,
        billImageUrl: imageUri,
        items: currentProcessedData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          participants: item.participants,
        })),
        participants: currentProcessedData.participants.map(p => ({
          name: p.name,
          walletAddress: p.walletAddress,
          userId: p.id,
          email: '', // Add empty email field
        })),
        settings: {
          allowPartialPayments: currentProcessedData.settings.allowPartialPayments,
          requireAllAccept: currentProcessedData.settings.requireAllAccept,
          autoCalculate: currentProcessedData.settings.autoCalculate,
          splitMethod: currentProcessedData.settings.splitMethod === 'manual' ? 'custom' : currentProcessedData.settings.splitMethod,
        },
      };

      navigation.navigate('SplitDetails', { 
        billData,
        processedBillData: currentProcessedData,
        analysisResult: processingResult,
      });
    }
  };

  const retakePhoto = () => {
    navigation.goBack();
  };

  if (isProcessing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.processingSubtitle}>
            Analyzing your image...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={retakePhoto}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Edit Bill</Text>
        
        <TouchableOpacity style={styles.cameraButton}>
          <Text style={styles.cameraButtonText}>CAMERA</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonSelected
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <TextInput
            style={styles.textInput}
            value={billName}
            onChangeText={setBillName}
            placeholder="Enter bill name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <View style={styles.dateContainer}>
            <TextInput
              style={styles.dateInput}
              value={date}
              onChangeText={setDate}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity style={styles.calendarButton}>
              <Text style={styles.calendarIcon}>DATE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            <View style={styles.currencyContainer}>
              <Text style={styles.currencyText}>{currency} €</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </View>
          </View>
          
          {/* Total Display */}
          <View style={styles.totalDisplay}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{convertedAmount} USDC</Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={proceedToSplitDetails}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


export default BillProcessingScreen;
