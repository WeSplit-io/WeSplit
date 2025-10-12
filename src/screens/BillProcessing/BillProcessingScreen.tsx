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
import { consolidatedBillAnalysisService } from '../../services/consolidatedBillAnalysisService';
import { useApp } from '../../context/AppContext';
import { SplitStorageService } from '../../services/splitStorageService';
import { SplitWalletService } from '../../services/split';

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
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<'ai' | 'mock' | null>(null);
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

  // Auto-proceed to split creation when OCR AI processing is complete
  useEffect(() => {
    if (currentProcessedBillData && !isEditing && processingResult?.success) {
      // OCR AI processing complete, auto-proceeding to split creation
      // Keep processing state active and proceed immediately
      proceedToSplitDetails();
    }
  }, [currentProcessedBillData, isEditing, processingResult]);

  /**
   * OCR AI Split Creation Logic
   * Handles the complete flow of processing bill images and creating splits
   */
  const processBillImage = async () => {
    setIsProcessing(true);
    setIsAIProcessing(true);
    setProcessingMethod(null);
    
    try {
      // Starting AI-powered bill analysis
      
      // Try AI service first with improved error handling
      let analysisResult = await consolidatedBillAnalysisService.analyzeBillFromImage(imageUri, currentUser?.id, false);
      
      // Handle AI analysis result with better error messages
      if (!analysisResult.success) {
        // AI analysis failed, using fallback
        
        // Check if it's a rate limiting error
        const isRateLimitError = analysisResult.error?.includes('overloaded') || 
                                analysisResult.error?.includes('429') || 
                                analysisResult.error?.includes('rate limit');
        
        if (isRateLimitError) {
          Alert.alert(
            'AI Service Busy',
            'The AI service is currently busy. Please wait a moment and try again, or use manual entry.',
            [
              { 
                text: 'Try Again', 
                onPress: () => {
                  setIsProcessing(false);
                  setIsAIProcessing(false);
                  setTimeout(() => processBillImage(), 2000); // Retry after 2 seconds
                }
              },
              { 
                text: 'Manual Entry', 
                onPress: () => navigation.navigate('ManualBillCreation')
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
        
        // For other errors, fallback to mock service
        // Falling back to mock data due to AI failure
        setProcessingMethod('mock');
        analysisResult = await consolidatedBillAnalysisService.analyzeBillFromImage(imageUri, currentUser?.id, true);
      } else {
        // AI analysis successful
        setProcessingMethod('ai');
      }
      
      setProcessingResult(analysisResult);
      
      if (analysisResult.success && analysisResult.data) {
        // Process the structured data with current user information
        const processedData = analysisResult.data;
        setCurrentProcessedBillData(processedData);
      
        // Set the authoritative price in the price management service immediately
        const { priceManagementService } = await import('../../services/priceManagementService');
        priceManagementService.setBillPrice(
          processedData.id,
          processedData.totalAmount,
          processedData.currency || 'USDC'
        );
        
        // Set authoritative price for bill
      
        // Update form fields with processed data
        updateFormWithProcessedData(processedData);
      } else {
        Alert.alert('Processing Failed', analysisResult.error || 'Failed to process bill image');
        setIsProcessing(false); // Set to false when processing fails
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
      setIsProcessing(false); // Only set to false on error
      Alert.alert('Error', 'Failed to process bill image. Please try again.');
    } finally {
      setIsAIProcessing(false);
      // Don't set isProcessing to false here for successful cases - let the auto-proceed handle it
    }
  };

  /**
   * Update form fields with processed bill data
   */
  const updateFormWithProcessedData = (processedData: ProcessedBillData) => {
    // Update legacy state for backward compatibility
    setExtractedItems(processedData.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
      participants: item.participants,
    })));
    
    // Update form fields
    setTotalAmount(processedData.totalAmount);
    setMerchant(processedData.merchant);
    setDate(processedData.date);
    setBillName(processedData.title);
    setAmount(processedData.totalAmount.toString());
    setConvertedAmount(processedData.totalAmount.toString());
    
    // Form updated with processed data
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

  /**
   * OCR AI Split Creation - Create Split with Wallet and Navigate to Split Details
   * Handles the complete creation flow for OCR-generated splits including wallet creation
   */
  const proceedToSplitDetails = async () => {
    try {
      // Creating OCR AI split with wallet
      
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
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
        const validation = consolidatedBillAnalysisService.validateIncomingData(currentProcessedData as any);
        if (!validation.isValid) {
          Alert.alert('Validation Error', validation.errors.join('\n'));
          return;
        }
      }

      // Data validated, creating split with wallet

      // If editing an existing split, update it in the database
      if (isEditing && existingSplitId && currentUser && currentProcessedData) {
        try {
          // Updating existing split
          
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
            // Split updated successfully
            
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
            // Failed to update split
            Alert.alert('Error', updateResult.error || 'Failed to update split');
          }
        } catch (error) {
          console.error('🔍 BillProcessingScreen: Error updating split:', error);
          Alert.alert('Error', 'Failed to update split');
        }
        return;
      }

      // Create new OCR AI split with wallet
      // Creating new OCR AI split with wallet
      
      // Create wallet first
      const walletResult = await SplitWalletService.createSplitWallet(
        currentProcessedData.id,
        currentUser.id.toString(),
        currentProcessedData.totalAmount,
        currentProcessedData.currency || 'USDC',
        currentProcessedData.participants.map(p => ({
          userId: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
        }))
      );

      if (!walletResult.success || !walletResult.wallet) {
        throw new Error(walletResult.error || 'Failed to create split wallet');
      }

      // Wallet created successfully

      // Ensure the creator is included as a participant
      const allParticipants = [...currentProcessedData.participants];
      
      // Check if creator is already in participants, if not add them
      const creatorExists = allParticipants.some(p => p.id === currentUser.id.toString());
      if (!creatorExists) {
        allParticipants.push({
          id: currentUser.id.toString(),
          name: currentUser.name,
          walletAddress: currentUser.wallet_address || '',
          amountOwed: 0, // Will be calculated
          status: 'accepted', // Creator should be accepted, not pending
          items: []
        });
      }

      // Create split in database with wallet information
      const splitData = {
        billId: currentProcessedData.id,
        title: currentProcessedData.title,
        description: `OCR Split for ${currentProcessedData.title}`,
        totalAmount: currentProcessedData.totalAmount,
        currency: currentProcessedData.currency,
        splitType: 'fair' as const,
        status: 'pending' as const, // Split starts as pending until user confirms repartition
        creatorId: currentUser.id.toString(),
        creatorName: currentUser.name,
        participants: allParticipants.map(p => ({
          userId: p.id,
          name: p.name,
          email: '',
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
          amountPaid: 0,
          status: p.id === currentUser.id.toString() ? 'accepted' as const : 'pending' as const,
        })),
        items: currentProcessedData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          participants: item.participants,
        })),
        merchant: {
          name: currentProcessedData.merchant,
          address: currentProcessedData.location,
          phone: '',
        },
        date: currentProcessedData.date,
        walletId: walletResult.wallet.id,
        walletAddress: walletResult.wallet.walletAddress,
      };

      // Create split in database
      const createResult = await SplitStorageService.createSplit(splitData);
      if (!createResult.success || !createResult.split) {
        throw new Error(createResult.error || 'Failed to create split in database');
      }

      // OCR AI split created successfully

      // Navigate to SplitDetails with the created split
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
        splitData: createResult.split,
        splitId: createResult.split.id,
        splitWallet: walletResult.wallet,
      });
      
    } catch (error) {
      console.error('❌ BillProcessingScreen: Error creating OCR AI split:', error);
      Alert.alert('Error', 'Failed to create split. Please try again.');
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
            {isAIProcessing ? '🤖 AI is analyzing your receipt...' : 
             currentProcessedBillData ? '✅ Creating your split with wallet...' : 'Analyzing your image...'}
          </Text>
          {processingMethod && (
            <Text style={styles.processingMethod}>
              {processingMethod === 'ai' ? '✅ AI analysis complete' : '📝 Using sample data'}
            </Text>
          )}
          {currentProcessedBillData && !isAIProcessing && (
            <Text style={styles.processingMethod}>
              🚀 Auto-creating split and redirecting...
            </Text>
          )}
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
