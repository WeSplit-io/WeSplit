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
import { BillItem, OCRProcessingResult, BillSplitCreationData } from '../../types/billSplitting';
import { billOCRService } from '../../services/billOCRService';

interface RouteParams {
  imageUri: string;
  billData?: Partial<BillSplitCreationData>;
}

interface BillProcessingScreenProps {
  navigation: any;
}

const BillProcessingScreen: React.FC<BillProcessingScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { imageUri, billData } = route.params as RouteParams;
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingResult, setProcessingResult] = useState<OCRProcessingResult | null>(null);
  const [extractedItems, setExtractedItems] = useState<BillItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    processBillImage();
  }, []);

  const processBillImage = async () => {
    setIsProcessing(true);
    
    try {
      // Use the actual OCR service
      const result = await billOCRService.processBillImage(imageUri);
      
      setProcessingResult(result);
      
      if (result.success) {
        setExtractedItems(result.extractedItems);
        setTotalAmount(result.totalAmount);
        // Extract merchant name from raw text (simplified)
        setMerchant(extractMerchantName(result.rawText));
      } else {
        Alert.alert('Processing Failed', result.error || 'Failed to process bill image');
      }
    } catch (error) {
      console.error('Error processing bill:', error);
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
    const billData: BillSplitCreationData = {
      title: `${merchant} - ${date}`,
      totalAmount,
      currency: 'USD',
      date,
      merchant,
      billImageUrl: imageUri,
      items: extractedItems,
      participants: [],
      settings: {
        allowPartialPayments: true,
        requireAllAccept: false,
        autoCalculate: true,
        splitMethod: 'by_items',
      },
    };

    navigation.navigate('SplitDetails', { billData });
  };

  const retakePhoto = () => {
    navigation.goBack();
  };

  if (isProcessing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={retakePhoto}>
          <Text style={styles.backButtonText}>← Retake</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Review Bill</Text>
        
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
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount:</Text>
            <Text style={styles.detailValue}>${totalAmount.toFixed(2)}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  processingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  processingSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  processingSteps: {
    alignItems: 'flex-start',
  },
  processingStep: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  proceedButton: {
    padding: spacing.sm,
  },
  proceedButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    margin: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  billImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  resultsContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  confidenceText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  processingTimeText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  detailsContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  itemsContainer: {
    margin: spacing.lg,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemIndex: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
  },
  itemFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemField: {
    flex: 1,
    minWidth: '50%',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldValue: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  totalContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  finalTotalLabel: {
    fontSize: typography.fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  finalTotalValue: {
    fontSize: typography.fontSize.lg,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default BillProcessingScreen;
