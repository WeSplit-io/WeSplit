/**
 * Bill Processing Screen
 * Handles OCR processing of bill images and displays results
 */

import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { BillAnalysisResult, ProcessedBillData } from '../../../types/billAnalysis';
import { consolidatedBillAnalysisService } from '../../../services/billing';
import { useApp } from '../../../context/AppContext';
import { notificationService } from '../../../services/notifications';
import { LoadingScreen } from '../../../components/shared';
import { logger } from '../../../services/analytics/loggingService';

interface RouteParams {
  imageUri: string;
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
  const { imageUri, processedBillData, analysisResult, isEditing, existingSplitId, existingSplitData } = route.params as RouteParams;
  
  const { state } = useApp();
  const { currentUser } = state;
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // If in edit mode, redirect to ManualBillCreationScreen immediately
  useEffect(() => {
    if (isEditing) {
      // Convert existing split data to ProcessedBillData format for ManualBillCreationScreen
      const editBillData: ProcessedBillData | undefined = existingSplitData ? {
        id: existingSplitData.billId || existingSplitData.id,
        title: existingSplitData.title,
        merchant: existingSplitData.merchant?.name || 'Unknown',
        location: existingSplitData.merchant?.address || '',
        date: existingSplitData.date,
        time: new Date(existingSplitData.createdAt).toLocaleTimeString(),
        currency: existingSplitData.currency,
        totalAmount: existingSplitData.totalAmount,
        subtotal: existingSplitData.subtotal ?? existingSplitData.totalAmount * 0.9,
        tax: existingSplitData.tax ?? existingSplitData.totalAmount * 0.1,
        items: (existingSplitData.items || []).map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
          quantity: item.quantity || 1,
          category: item.category || 'Other',
          total: item.total || (item.price * (item.quantity || 1)),
          participants: item.participants || [],
          isSelected: true,
        })),
        participants: (existingSplitData.participants || []).map(p => ({
          id: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          status: p.status as 'pending' | 'accepted' | 'declined',
          amountOwed: p.amountOwed,
          items: [],
          avatar: p.avatar || '',
        })),
        settings: {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal' as const,
          currency: 'USDC',
          taxIncluded: true,
        },
        merchantPhone: existingSplitData.merchant?.phone,
        receiptNumber: existingSplitData.receiptNumber,
      } : processedBillData;

      // Navigate to ManualBillCreationScreen for editing
      navigation.replace('ManualBillCreation', {
        isEditing: true,
        existingBillData: editBillData,
        existingSplitId: existingSplitId,
        existingSplitData: existingSplitData,
        imageUri: imageUri,
      });
      return;
    }

    // For new bills, process OCR
    if (!isEditing) {
      processBillImage();
    }
  }, [isEditing, existingSplitData, existingSplitId, imageUri, processedBillData]);

  /**
   * OCR Processing Logic
   * Processes bill image and redirects to ManualBillCreationScreen for review/editing
   */
  const processBillImage = async () => {
    setIsProcessing(true);
    setIsAIProcessing(true);
    
    try {
      // Starting optimized AI-powered bill analysis
      
      // Try AI service first with improved error handling - NO MOCK DATA
      const analysisResult = await consolidatedBillAnalysisService.analyzeBillFromImage(imageUri, currentUser || undefined, false);
      
      // Handle AI analysis result with better error messages
      if (!analysisResult.success) {
        // AI analysis failed, using fallback
        
        // Check if it's a rate limiting error
        const isRateLimitError = analysisResult.error?.includes('overloaded') || 
                                analysisResult.error?.includes('429') || 
                                analysisResult.error?.includes('rate limit');
        
        if (isRateLimitError) {
          // Send notification about AI service being busy
          if (currentUser?.id) {
            await notificationService.instance.sendNotification(
              currentUser.id,
              'AI Service Busy',
              'The AI service is currently busy. Please try again later or use manual entry.',
              'system_warning',
              {
                errorType: 'ai_rate_limit',
                timestamp: new Date().toISOString()
              }
            );
          }
          
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
                onPress: () => navigation.replace('ManualBillCreation', { isFromOCR: false })
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
        
        // For other errors, show user options instead of automatic fallback
        logger.error('AI analysis failed', { error: analysisResult.error }, 'BillProcessingScreen');
        setIsProcessing(false);
        setIsAIProcessing(false);
        
        Alert.alert(
          'AI Analysis Failed',
          `The AI service encountered an error: ${analysisResult.error}\n\nWould you like to try again or use manual entry?`,
          [
            { 
              text: 'Try Again', 
              onPress: () => {
                setTimeout(() => processBillImage(), 1000); // Retry after 1 second
              }
            },
            { 
              text: 'Manual Entry', 
              onPress: () => navigation.replace('ManualBillCreation', { isFromOCR: false })
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      
      if (analysisResult.success && analysisResult.data) {
        // OCR analysis successful - redirect to ManualBillCreationScreen with pre-filled data
        // This allows user to review and edit OCR-extracted data before creating split
        const processedData = analysisResult.data;
        
        logger.info('OCR analysis successful, redirecting to manual creation for review', {
          title: processedData.title,
          totalAmount: processedData.totalAmount,
          itemsCount: processedData.items?.length || 0
        }, 'BillProcessingScreen');

        // Navigate to ManualBillCreationScreen with OCR data pre-filled
        // Only pass necessary data to optimize performance
        navigation.replace('ManualBillCreation', {
          ocrData: processedData,
          isFromOCR: true,
          analysisResult: {
            success: analysisResult.success,
            confidence: analysisResult.confidence,
            processingTime: analysisResult.processingTime,
            error: analysisResult.error,
          },
        });
        setIsProcessing(false);
        setIsAIProcessing(false);
        return;
      } else {
        // OCR failed or returned no data - redirect to ManualBillCreationScreen for manual entry
        logger.info('OCR analysis failed or incomplete, redirecting to manual creation', {
          error: analysisResult.error,
          hasData: !!analysisResult.data
        }, 'BillProcessingScreen');

        // Navigate to ManualBillCreationScreen for manual entry
        navigation.replace('ManualBillCreation', {
          isFromOCR: true,
          ocrError: analysisResult.error || 'Failed to extract bill data from image',
          analysisResult: {
            success: false,
            error: analysisResult.error,
            confidence: analysisResult.confidence,
          },
        });
        setIsProcessing(false);
        setIsAIProcessing(false);
        return;
      }
      
    } catch (error) {
      logger.error('Error processing bill', error as Record<string, unknown>, 'BillProcessingScreen');
      setIsProcessing(false);
      setIsAIProcessing(false);
      
      // Navigate to ManualBillCreationScreen on error
      navigation.replace('ManualBillCreation', {
        isFromOCR: true,
        ocrError: 'Failed to process bill image. Please try again.',
      });
        }
  };

  // BillProcessingScreen now only shows loading during OCR processing
  // After processing, it redirects to ManualBillCreationScreen
  // Edit mode is handled by redirecting to ManualBillCreationScreen immediately
    const processingMessage = isAIProcessing 
      ? '🤖 AI is analyzing your receipt...' 
        : 'Analyzing your image...';
    
    return (
      <LoadingScreen
        message={processingMessage}
        showSpinner={true}
      />
  );
};


export default BillProcessingScreen;
