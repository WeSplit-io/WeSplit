/**
 * Custom hook for managing split details data
 * Provides state management for split details screen
 * Updated to fix import issues
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { consolidatedBillAnalysisService } from '../services/consolidatedBillAnalysisService';
import { SplitStorageService } from '../services/splitStorageService';
import { splitRealtimeService, SplitRealtimeUpdate } from '../services/splitRealtimeService';
import { UnifiedBillData } from '../types/unified';
import { logger } from '../services/loggingService';

interface UseSplitDetailsParams {
  routeParams: any;
  currentUser: any;
}

interface UseSplitDetailsResult {
  // State
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  unifiedBillData: UnifiedBillData | null;
  participants: any[];
  totalAmount: number;
  splitMethod: string;
  allowPartialPayments: boolean;
  requireAllAccept: boolean;
  autoCalculate: boolean;
  taxIncluded: boolean;
  showQRModal: boolean;
  showNFCModal: boolean;
  showShareModal: boolean;
  qrData: string | null;
  shareableLink: string | null;
  isRealtimeActive: boolean;
  lastRealtimeUpdate: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  updateParticipant: (participant: any) => void;
  updateSplitMethod: (method: string) => void;
  updateSplitSettings: (settings: any) => void;
  saveSplit: () => Promise<void>;
  showQRCode: () => void;
  hideQRCode: () => void;
  showNFC: () => void;
  hideNFC: () => void;
  showShare: () => void;
  hideShare: () => void;
  copyToClipboard: (text: string) => void;
  startRealtimeUpdates: () => void;
  stopRealtimeUpdates: () => void;
}

export const useSplitDetails = ({ routeParams, currentUser }: UseSplitDetailsParams): UseSplitDetailsResult => {
  const { state } = useApp();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unifiedBillData, setUnifiedBillData] = useState<UnifiedBillData | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [splitMethod, setSplitMethod] = useState('equal');
  const [allowPartialPayments, setAllowPartialPayments] = useState(false);
  const [requireAllAccept, setRequireAllAccept] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [taxIncluded, setTaxIncluded] = useState(false);
  
  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  
  // Real-time update states
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);

  // Load split data
  const loadSplitData = useCallback(async () => {
    if (!routeParams?.splitId) {return;}
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to get split data from storage
      const splitResult = await SplitStorageService.getSplit(routeParams.splitId);
      
      if (!splitResult.success || !splitResult.split) {
        throw new Error(splitResult.error || 'Split not found');
      }
      
      const splitData = splitResult.split;
      
      if (splitData) {
        // Map split data to unified bill data format
        const billData: UnifiedBillData = {
          id: splitData.id,
          title: splitData.title,
          merchant: splitData.merchant?.name || 'Unknown',
          location: splitData.merchant?.address || '',
          date: splitData.date,
          time: new Date(splitData.createdAt).toLocaleTimeString(),
          currency: splitData.currency,
          totalAmount: splitData.totalAmount,
          subtotal: splitData.totalAmount * 0.9, // Estimate
          tax: splitData.totalAmount * 0.1, // Estimate
          items: splitData.items || [],
          participants: splitData.participants || [],
          settings: {
            allowPartialPayments: false,
            requireAllAccept: false,
            autoCalculate: true,
            splitMethod: splitData.splitMethod || 'equal',
            taxIncluded: false
          },
          originalAnalysis: {} as any // Placeholder
        };
        
        setUnifiedBillData(billData);
        setParticipants(splitData.participants || []);
        setTotalAmount(splitData.totalAmount || 0);
        setSplitMethod(splitData.splitMethod || 'equal');
        setAllowPartialPayments(false); // Default values
        setRequireAllAccept(false);
        setAutoCalculate(true);
        setTaxIncluded(false);
      }
    } catch (err) {
      console.error('Error loading split data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load split data');
    } finally {
      setLoading(false);
    }
  }, [routeParams?.splitId]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadSplitData();
    setRefreshing(false);
  }, [loadSplitData]);

  // Update participant
  const updateParticipant = useCallback((participant: any) => {
    setParticipants(prev => prev.map(p => p.id === participant.id ? participant : p));
  }, []);

  // Update split method
  const updateSplitMethod = useCallback((method: string) => {
    setSplitMethod(method);
  }, []);

  // Update split settings
  const updateSplitSettings = useCallback((settings: any) => {
    if (settings.allowPartialPayments !== undefined) {setAllowPartialPayments(settings.allowPartialPayments);}
    if (settings.requireAllAccept !== undefined) {setRequireAllAccept(settings.requireAllAccept);}
    if (settings.autoCalculate !== undefined) {setAutoCalculate(settings.autoCalculate);}
    if (settings.taxIncluded !== undefined) {setTaxIncluded(settings.taxIncluded);}
  }, []);

  // Save data
  const saveSplit = useCallback(async () => {
    if (!unifiedBillData || !routeParams?.splitId) {return;}
    
    setLoading(true);
    try {
      // Update the split with new data
      const updateData = {
        participants,
        totalAmount,
        splitMethod,
        updatedAt: new Date().toISOString()
      };
      
      const result = await SplitStorageService.updateSplit(routeParams.splitId, updateData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update split');
      }
    } catch (err) {
      console.error('Error saving split data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save split data');
    } finally {
      setLoading(false);
    }
  }, [participants, totalAmount, splitMethod, routeParams?.splitId]);

  // Share data
  const shareData = useCallback(() => {
    if (unifiedBillData) {
      const shareText = `Check out this split: ${unifiedBillData.title} - $${totalAmount}`;
      setShareableLink(shareText);
      setShowShareModal(true);
    }
  }, [unifiedBillData, totalAmount]);

  // QR Code actions
  const showQRCode = useCallback(() => {
    if (unifiedBillData) {
      setQrData(JSON.stringify({
        splitId: routeParams?.splitId,
        title: unifiedBillData.title,
        totalAmount
      }));
      setShowQRModal(true);
    }
  }, [unifiedBillData, totalAmount, routeParams?.splitId]);

  const hideQRCode = useCallback(() => {
    setShowQRModal(false);
    setQrData(null);
  }, []);

  // NFC actions
  const showNFC = useCallback(() => {
    setShowNFCModal(true);
  }, []);

  const hideNFC = useCallback(() => {
    setShowNFCModal(false);
  }, []);

  // Share actions
  const showShare = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const hideShare = useCallback(() => {
    setShowShareModal(false);
    setShareableLink(null);
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    // This would typically use a clipboard library
    logger.info('Copy to clipboard', { text }, 'useSplitDetails');
  }, []);

  // Real-time update functions
  const startRealtimeUpdates = useCallback(async () => {
    if (!routeParams?.splitId || isRealtimeActive) {return;}
    
    try {
      logger.info('Starting real-time updates for split', { splitId: routeParams.splitId }, 'useSplitDetails');
      
      const cleanup = await splitRealtimeService.startListening(
        routeParams.splitId,
        {
          onSplitUpdate: (update: SplitRealtimeUpdate) => {
            logger.debug('Real-time split update received', { 
              splitId: routeParams.splitId,
              hasChanges: update.hasChanges,
              participantsCount: update.participants.length
            }, 'useSplitDetails');
            
            if (update.split) {
              // Update the unified bill data
              const billData: UnifiedBillData = {
                id: update.split.id,
                title: update.split.title,
                merchant: update.split.merchant?.name || 'Unknown',
                location: update.split.merchant?.address || '',
                date: update.split.date,
                time: new Date(update.split.createdAt).toLocaleTimeString(),
                currency: update.split.currency,
                totalAmount: update.split.totalAmount,
                subtotal: update.split.totalAmount * 0.9, // Estimate
                tax: update.split.totalAmount * 0.1, // Estimate
                items: update.split.items || [],
                participants: update.participants,
                settings: {
                  allowPartialPayments: false,
                  requireAllAccept: false,
                  autoCalculate: true,
                  splitMethod: update.split.splitMethod || 'equal',
                  taxIncluded: false
                },
                originalAnalysis: {} as any // Placeholder
              };
              
              setUnifiedBillData(billData);
              setParticipants(update.participants);
              setTotalAmount(update.split.totalAmount || 0);
              setSplitMethod(update.split.splitMethod || 'equal');
              setLastRealtimeUpdate(update.lastUpdated);
            }
          },
          onParticipantUpdate: (participants) => {
            logger.debug('Real-time participant update received', { 
              splitId: routeParams.splitId,
              participantsCount: participants.length
            }, 'useSplitDetails');
            
            setParticipants(participants);
          },
          onError: (error) => {
            logger.error('Real-time update error', { 
              splitId: routeParams.splitId,
              error: error.message 
            }, 'useSplitDetails');
            setError(`Real-time update error: ${error.message}`);
          }
        }
      );
      
      realtimeCleanupRef.current = cleanup;
      setIsRealtimeActive(true);
      
    } catch (error) {
      logger.error('Failed to start real-time updates', { 
        splitId: routeParams.splitId,
        error: error.message 
      }, 'useSplitDetails');
      setError(`Failed to start real-time updates: ${error.message}`);
    }
  }, [routeParams?.splitId, isRealtimeActive]);

  const stopRealtimeUpdates = useCallback(() => {
    if (!isRealtimeActive) {return;}
    
    try {
      logger.info('Stopping real-time updates for split', { splitId: routeParams?.splitId }, 'useSplitDetails');
      
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
        realtimeCleanupRef.current = null;
      }
      
      splitRealtimeService.stopListening(routeParams?.splitId);
      setIsRealtimeActive(false);
      setLastRealtimeUpdate(null);
      
    } catch (error) {
      logger.error('Failed to stop real-time updates', { 
        splitId: routeParams?.splitId,
        error: error.message 
      }, 'useSplitDetails');
    }
  }, [routeParams?.splitId, isRealtimeActive]);

  // Load data on mount
  useEffect(() => {
    loadSplitData();
  }, [loadSplitData]);

  // Start real-time updates when split data is loaded
  useEffect(() => {
    if (routeParams?.splitId && !isRealtimeActive) {
      startRealtimeUpdates().catch(error => {
        console.error('Failed to start real-time updates:', error);
      });
    }
  }, [routeParams?.splitId, isRealtimeActive, startRealtimeUpdates]);

  // Cleanup real-time updates on unmount
  useEffect(() => {
    return () => {
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
      }
    };
  }, []);

  return {
    // State
    loading,
    error,
    refreshing,
    unifiedBillData,
    participants,
    totalAmount,
    splitMethod,
    allowPartialPayments,
    requireAllAccept,
    autoCalculate,
    taxIncluded,
    showQRModal,
    showNFCModal,
    showShareModal,
    qrData,
    shareableLink,
    isRealtimeActive,
    lastRealtimeUpdate,
    
    // Actions
    refreshData,
    updateParticipant,
    updateSplitMethod,
    updateSplitSettings,
    saveSplit,
    showQRCode,
    hideQRCode,
    showNFC,
    hideNFC,
    showShare,
    hideShare,
    copyToClipboard,
    startRealtimeUpdates,
    stopRealtimeUpdates
  };
};
