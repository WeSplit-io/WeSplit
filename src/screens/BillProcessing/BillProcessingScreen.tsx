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

interface RouteParams {
  imageUri: string;
  billData?: Partial<BillSplitCreationData>;
  processedBillData?: ProcessedBillData;
  analysisResult?: BillAnalysisResult;
  isEditing?: boolean;
}

interface BillProcessingScreenProps {
  navigation: any;
}

const BillProcessingScreen: React.FC<BillProcessingScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { imageUri, billData, processedBillData, analysisResult, isEditing } = route.params as RouteParams;
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
    isEditing && processedBillData ? processedBillData.totalAmount : 0
  );
  const [merchant, setMerchant] = useState(
    isEditing && processedBillData ? processedBillData.merchant : ''
  );
  const [date, setDate] = useState(
    isEditing && processedBillData ? processedBillData.date : new Date().toISOString().split('T')[0]
  );

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
        const processedData = BillAnalysisService.processBillData(analysisResult.data, currentUser);
        setCurrentProcessedBillData(processedData);
      
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

  const proceedToSplitDetails = () => {
    // If in edit mode, use existing processed data or create new one
    let currentProcessedData = currentProcessedBillData;
    
    if (!currentProcessedData) {
      // Create processed data from current state
      const billId = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      currentProcessedData = {
        id: billId,
        title: `${merchant} - ${date}`,
        merchant: merchant,
        location: '',
        date: date,
        time: new Date().toLocaleTimeString(),
        currency: 'USD',
        totalAmount: totalAmount,
        subtotal: totalAmount * 0.9, // Estimate
        tax: totalAmount * 0.1, // Estimate
        items: extractedItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          participants: item.participants,
          isSelected: true,
        })),
        participants: [],
        settings: {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal',
          taxIncluded: true,
        },
        originalAnalysis: {} as BillAnalysisData,
      };
    }

    // Validate the processed data
    const validation = BillAnalysisService.validateBillData(currentProcessedData);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // Convert to legacy format for backward compatibility
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
        id: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        status: p.status,
      })),
      settings: currentProcessedData.settings,
    };

    navigation.navigate('SplitDetails', { 
      billData,
      processedBillData: currentProcessedData,
      analysisResult: processingResult,
    });
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
          <Text style={styles.processingTitle}>Processing Bill</Text>
          <Text style={styles.processingSubtitle}>
            Analyzing your bill image and extracting items...
          </Text>
          
          <View style={styles.processingSteps}>
            <Text style={styles.processingStep}>✓ Image captured</Text>
            <Text style={styles.processingStep}>🔄 Extracting text</Text>
            <Text style={styles.processingStep}>⏳ Identifying items</Text>
            <Text style={styles.processingStep}>⏳ Calculating totals</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={retakePhoto}>
          <Text style={styles.backButtonText}>{isEditing ? '← Back' : '← Retake'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Bill' : 'Review Bill'}</Text>
        
        <TouchableOpacity style={styles.proceedButton} onPress={proceedToSplitDetails}>
          <Text style={styles.proceedButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Bill Image Preview */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.billImage} />
        </View>

        {/* Processing Results */}
        {processingResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Processing Results</Text>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(processingResult.confidence * 100)}%
            </Text>
            <Text style={styles.processingTimeText}>
              Processing time: {processingResult.processingTime}s
            </Text>
          </View>
        )}

        {/* Bill Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Merchant:</Text>
            <Text style={styles.detailValue}>{merchant}</Text>
          </View>
          
          {processedBillData?.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{processedBillData.location}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>
          
          {processedBillData?.time && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>{processedBillData.time}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subtotal:</Text>
            <Text style={styles.detailValue}>${processedBillData?.subtotal.toFixed(2) || totalAmount.toFixed(2)}</Text>
          </View>
          
          {processedBillData?.tax && processedBillData.tax > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tax:</Text>
              <Text style={styles.detailValue}>${processedBillData.tax.toFixed(2)}</Text>
            </View>
          )}
          
          <View style={[styles.detailRow, styles.finalTotal]}>
            <Text style={styles.finalTotalLabel}>Total Amount:</Text>
            <Text style={styles.finalTotalValue}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Extracted Items */}
        <View style={styles.itemsContainer}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>Bill Items</Text>
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {extractedItems.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIndex}>#{index + 1}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(item.id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.itemFields}>
                <View style={styles.itemField}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <Text style={styles.fieldValue}>{item.name || 'Unnamed Item'}</Text>
                </View>
                
                <View style={styles.itemField}>
                  <Text style={styles.fieldLabel}>Price</Text>
                  <Text style={styles.fieldValue}>${item.price.toFixed(2)}</Text>
                </View>
                
                {item.category && (
                  <View style={styles.itemField}>
                    <Text style={styles.fieldLabel}>Category</Text>
                    <Text style={styles.fieldValue}>{item.category}</Text>
                  </View>
                )}
                
                {item.quantity && item.quantity > 1 && (
                  <View style={styles.itemField}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <Text style={styles.fieldValue}>{item.quantity}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Total Summary */}
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>$0.00</Text>
          </View>
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.finalTotalLabel}>Total:</Text>
            <Text style={styles.finalTotalValue}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default BillProcessingScreen;
