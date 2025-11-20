/**
 * Splits List Screen
 * Main screen for viewing and managing bill splits
 * Renamed from GroupsListScreen to focus on bill splitting functionality
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Image,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styles';  
import { colors } from '../../../theme/colors';
import NavBar from '../../../components/shared/NavBar';
import Avatar from '../../../components/shared/Avatar';
import GroupIcon from '../../../components/GroupIcon';
import Icon from '../../../components/Icon';
import { Container, Button, ModernLoader } from '../../../components/shared';
import Tabs from '../../../components/shared/Tabs';
import SharedWalletCard from '../../../components/SharedWalletCard';
import { BillSplitSummary } from '../../../types/billSplitting';
import { splitStorageService, Split, SplitStorageService } from '../../../services/splits';
import { SharedWalletService, SharedWallet } from '../../../services/sharedWallet';
import { logger } from '../../../services/analytics/loggingService';
import { MockupDataService } from '../../../services/data/mockupData';
import { priceManagementService } from '../../../services/core';
import { useApp } from '../../../context/AppContext';
import { firebaseDataService } from '../../../services/data';
import { 
  getSplitStatusDisplayText, 
  getSplitStatusBadgeStyle, 
  getSplitStatusTextStyle, 
  getSplitStatusDotStyle 
} from '../../../utils/statusUtils';


interface SplitsListScreenProps {
  navigation: any;
}

// Avatar component wrapper for backward compatibility
const AvatarComponent = ({ avatar, displayName, style, userId }: { avatar?: string, displayName: string, style: any, userId?: string }) => {
  return (
    <Avatar
      userId={userId}
      userName={displayName}
      avatarUrl={avatar}
      size={32}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.white10,
        ...style,
      }}
    />
  );
};

const SplitsListScreen: React.FC<SplitsListScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [splits, setSplits] = useState<Split[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [participantAvatars, setParticipantAvatars] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalSplits, setTotalSplits] = useState(0); // Track total splits for page calculation
  const [lastDoc, setLastDoc] = useState<any>(null); // Store last document for pagination
  const [pageHistory, setPageHistory] = useState<Array<{ page: number; lastDoc: any }>>([]); // Track page history for navigation
  const [activeTab, setActiveTab] = useState<'splits' | 'sharedWallets'>('splits'); // NEW: Top-level tab state
  const [sharedWallets, setSharedWallets] = useState<SharedWallet[]>([]);
  const [isLoadingSharedWallets, setIsLoadingSharedWallets] = useState(false);
  const SPLITS_PER_PAGE = 20;
  
  // Refs to prevent infinite loops
  const hasLoadedOnFocusRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const lastRouteParamsRef = useRef<string>(''); // Track last route params to detect changes
  const userHasManuallyChangedTabRef = useRef(false); // Track if user manually changed tab
  
  // Calculate total pages
  const totalPages = Math.ceil(totalSplits / SPLITS_PER_PAGE) || 1;

  // Load participant avatars dynamically
  const loadParticipantAvatars = useCallback(async (splits: Split[]) => {
    try {
      const userIds = new Set<string>();

      // Collect all unique user IDs from splits
      splits.forEach(split => {
        split.participants.forEach(participant => {
          if (participant.userId) {
            userIds.add(participant.userId);
          }
        });
      });

      if (userIds.size === 0) {return;}

      // Fetch user profiles in parallel with cache busting
      const avatarPromises = Array.from(userIds).map(async (userId) => {
        try {
          // Force refresh user data to get latest avatar
          const profile = await firebaseDataService.user.getCurrentUser(userId);
          return { userId, avatar: profile?.avatar || '' };
        } catch (error) {
          console.error(`Error fetching avatar for user ${userId}:`, error);
          return { userId, avatar: '' };
        }
      });

      const avatarResults = await Promise.all(avatarPromises);

      // Create avatar mapping
      const avatarMap: Record<string, string> = {};
      avatarResults.forEach(({ userId, avatar }) => {
        avatarMap[userId] = avatar;
      });

      setParticipantAvatars(avatarMap);
      
      if (__DEV__) {
        console.log('🔍 Avatars loaded for participants:', Object.keys(avatarMap).length);
      }
    } catch (error) {
      console.error('Error loading participant avatars:', error);
    }
  }, []);

  // Test pool for design (removed hardcoded data)

  useEffect(() => {
    if (currentUser?.id) {
      // Check if user changed
      if (lastUserIdRef.current !== currentUser.id) {
        // Reset to page 1 when user changes
        setCurrentPage(1);
        setPageHistory([]);
        setLastDoc(null);
        hasLoadedOnFocusRef.current = false;
        lastUserIdRef.current = currentUser.id;
        loadSplits(1, undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // loadSplits is stable and doesn't need to be in deps
  }, [currentUser?.id]);

  // Load shared wallets
  const loadSharedWallets = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    setIsLoadingSharedWallets(true);
    try {
      const result = await SharedWalletService.getUserSharedWallets(currentUser.id.toString());
      if (result.success && result.wallets) {
        setSharedWallets(result.wallets);
        if (__DEV__) {
          logger.debug('Shared wallets loaded successfully', { 
            count: result.wallets.length,
            walletIds: result.wallets.map(w => w.id)
          }, 'SplitsListScreen');
        }
      } else {
        logger.error('Failed to load shared wallets', { error: result.error }, 'SplitsListScreen');
        // Don't clear wallets on error - keep existing ones to prevent flickering
        // Only clear if we have no wallets yet
        setSharedWallets(prev => prev.length === 0 ? [] : prev);
      }
    } catch (error) {
      logger.error('Error loading shared wallets', error, 'SplitsListScreen');
      // Don't clear wallets on error - keep existing ones to prevent flickering
      // Only clear if we have no wallets yet
      setSharedWallets(prev => prev.length === 0 ? [] : prev);
    } finally {
      setIsLoadingSharedWallets(false);
    }
  }, [currentUser?.id]);

  // Handle route params to set active tab (e.g., when navigating from CreateSharedWallet or SharedWalletDetails)
  // Only apply if user hasn't manually changed the tab and route params have changed
  useEffect(() => {
    const currentRouteParams = route?.params || {};
    const routeParamsKey = JSON.stringify(currentRouteParams);
    const newInitialTab = currentRouteParams.activeTab as 'splits' | 'sharedWallets' | undefined;
    
    // Only apply route params if:
    // 1. There's a new tab in route params
    // 2. The route params have actually changed (not just re-render)
    // 3. User hasn't manually changed the tab
    // 4. The new tab is different from current tab
    if (
      newInitialTab &&
      routeParamsKey !== lastRouteParamsRef.current &&
      !userHasManuallyChangedTabRef.current &&
      newInitialTab !== activeTab
    ) {
      setActiveTab(newInitialTab);
      lastRouteParamsRef.current = routeParamsKey;
      // Clear route params after applying to prevent re-applying
      if (navigation.setParams) {
        navigation.setParams({ activeTab: undefined });
      }
    } else if (routeParamsKey !== lastRouteParamsRef.current) {
      // Update ref even if we don't apply, to track changes
      lastRouteParamsRef.current = routeParamsKey;
    }
  }, [route?.params, activeTab, navigation]);

  // Refresh splits when screen comes into focus (e.g., after joining a split or creating a new one)
  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id) {
        return;
      }
      
      // Check if user changed (login/logout)
      const userChanged = lastUserIdRef.current !== currentUser.id;
      if (userChanged) {
        hasLoadedOnFocusRef.current = false;
        lastUserIdRef.current = currentUser.id;
        // Reset to page 1 when user changes
        setCurrentPage(1);
        setPageHistory([]);
        setLastDoc(null);
        // Reset manual tab change flag when user changes
        userHasManuallyChangedTabRef.current = false;
        lastRouteParamsRef.current = '';
      }
      
      // Always reload on focus to ensure we have the latest data
      // This is important when user creates a new split/wallet and navigates back
      if (__DEV__) {
        logger.debug('Screen focused, loading data for user', { userId: currentUser.id }, 'SplitsListScreen');
      }
      
      // Load splits if on splits tab
      if (activeTab === 'splits') {
        // Clear avatar cache to force reload
        setParticipantAvatars({});
        // Load page 1 on focus (user might have created a new split)
        loadSplits(1, undefined);
        hasLoadedOnFocusRef.current = true;
      } else if (activeTab === 'sharedWallets') {
        // Load shared wallets if on shared wallets tab
        loadSharedWallets();
      }
    }, [currentUser?.id, activeTab, loadSharedWallets])
  );


  // Load shared wallets when tab changes to sharedWallets
  // Only load if we don't already have wallets to prevent unnecessary reloads
  useEffect(() => {
    if (activeTab === 'sharedWallets' && currentUser?.id && sharedWallets.length === 0 && !isLoadingSharedWallets) {
      loadSharedWallets();
    }
  }, [activeTab, currentUser?.id, loadSharedWallets, sharedWallets.length, isLoadingSharedWallets]);

  // Load participant avatars when splits change
  useEffect(() => {
    if (splits.length > 0) {
      loadParticipantAvatars(splits);
    }
  }, [splits, loadParticipantAvatars]);

  const loadSplits = async (page: number = 1, lastDocument?: any) => {
    if (!currentUser?.id) {
      logger.debug('No current user, skipping load', null, 'SplitsListScreen');
      return;
    }

    setIsLoading(true);

    try {
      if (__DEV__) {
        logger.debug('Loading splits for user', { userId: currentUser.id, page }, 'SplitsListScreen');
      }

      const result = await SplitStorageService.getUserSplits(
        String(currentUser.id),
        SPLITS_PER_PAGE,
        page,
        lastDocument
      );

      if (result.success && result.splits) {
        if (__DEV__) {
          logger.debug('Loaded splits', {
            count: result.splits.length,
            hasMore: result.hasMore,
            page: result.currentPage,
            willShowPagination: result.hasMore || result.currentPage > 1
          }, 'SplitsListScreen');
        }

        // Fix existing splits where creator has 'pending' status and validate prices
        // Also sync wallet status for degen splits
        const updatedSplits = await Promise.all(result.splits.map(async (split) => {
          // Get authoritative price from centralized price management
          const billId = split.billId || split.id;
          const authoritativePrice = priceManagementService.getBillPrice(billId);

          let updatedSplit = split;

          // Update price if authoritative price is available
          if (authoritativePrice) {
            logger.debug('Using authoritative price for split', {
              splitId: split.id,
              originalAmount: split.totalAmount,
              authoritativeAmount: authoritativePrice.amount
            });
            updatedSplit = {
              ...split,
              totalAmount: authoritativePrice.amount
            };
          }

          // CRITICAL: For degen splits, check wallet status and sync if needed
          if (updatedSplit.splitType === 'degen' && updatedSplit.walletId) {
            try {
              const { SplitWalletService } = await import('../../../services/split');
              const walletResult = await SplitWalletService.getSplitWallet(updatedSplit.walletId);
              
              if (walletResult.success && walletResult.wallet) {
                const wallet = walletResult.wallet;
                
                // If wallet status is 'closed' but split status is not synced, update it
                if (wallet.status === 'closed' && updatedSplit.status !== 'completed') {
                  logger.info('Syncing split status from closed wallet', {
                    splitId: updatedSplit.id,
                    walletId: wallet.id,
                    walletStatus: wallet.status,
                    splitStatus: updatedSplit.status
                  }, 'SplitsListScreen');
                  
                  try {
                    const { SplitDataSynchronizer } = await import('../../../services/split/SplitDataSynchronizer');
                    await SplitDataSynchronizer.syncSplitStatusFromSplitWalletToSplitStorage(
                      updatedSplit.billId,
                      'closed',
                      wallet.completedAt
                    );
                    
                    // Update local split status for immediate display
                    updatedSplit = {
                      ...updatedSplit,
                      status: 'completed' as const
                    };
                  } catch (syncError) {
                    logger.error('Failed to sync split status from wallet', {
                      splitId: updatedSplit.id,
                      error: syncError instanceof Error ? syncError.message : String(syncError)
                    }, 'SplitsListScreen');
                    // Still update local status for display even if sync fails
                    updatedSplit = {
                      ...updatedSplit,
                      status: 'completed' as const
                    };
                  }
                } else if (wallet.status === 'spinning_completed' && updatedSplit.status === 'completed') {
                  // Wallet is still spinning_completed, but split was marked completed
                  // Keep the split status as is (it's already synced)
                }
              }
            } catch (walletError) {
              logger.debug('Could not check wallet status for split', {
                splitId: updatedSplit.id,
                walletId: updatedSplit.walletId,
                error: walletError instanceof Error ? walletError.message : String(walletError)
              }, 'SplitsListScreen');
              // Continue with split as-is if wallet check fails
            }
          }

          const creatorParticipant = updatedSplit.participants.find(p => p.userId === updatedSplit.creatorId);
          if (creatorParticipant && creatorParticipant.status === 'pending') {
            logger.debug('Fixing creator status for split', { splitId: updatedSplit.id }, 'SplitsListScreen');
            try {
              await SplitStorageService.updateParticipantStatus(
                updatedSplit.firebaseDocId || updatedSplit.id,
                updatedSplit.creatorId,
                'accepted'
              );
              // Update the local split data
              const updatedParticipants = updatedSplit.participants.map(p =>
                p.userId === updatedSplit.creatorId ? { ...p, status: 'accepted' as const } : p
              );
              return { ...updatedSplit, participants: updatedParticipants };
            } catch (error) {
              console.error('🔍 SplitsListScreen: Error updating creator status:', error);
              return updatedSplit;
            }
          }
          return updatedSplit;
        }));

        // Set the splits without test data
        setSplits(updatedSplits);
        // hasMore is true if we got exactly SPLITS_PER_PAGE splits (meaning there might be more)
        const calculatedHasMore = result.hasMore !== undefined ? result.hasMore : (updatedSplits.length === SPLITS_PER_PAGE);
        setHasMore(calculatedHasMore);
        setCurrentPage(page);
        
        // Update total splits count for page calculation
        // If we're on page 1, estimate total based on hasMore
        if (page === 1) {
          if (calculatedHasMore) {
            // We have at least SPLITS_PER_PAGE + 1 splits
            setTotalSplits(updatedSplits.length + 1); // Minimum estimate
          } else {
            // This is all the splits
            setTotalSplits(updatedSplits.length);
          }
        } else {
          // For subsequent pages, update estimate
          const estimatedTotal = (page - 1) * SPLITS_PER_PAGE + updatedSplits.length;
          if (calculatedHasMore) {
            setTotalSplits(estimatedTotal + 1); // At least one more
          } else {
            setTotalSplits(estimatedTotal); // This is the total
          }
        }
        
        if (__DEV__) {
          console.log('🔍 SplitsListScreen: Pagination state', {
            splitsCount: updatedSplits.length,
            hasMore: calculatedHasMore,
            currentPage: page,
            totalSplits: totalSplits,
            totalPages: Math.ceil(totalSplits / SPLITS_PER_PAGE) || 1
          });
        }
        
        // Store last document for next page navigation
        if (result.lastDoc) {
          setLastDoc(result.lastDoc);
          // Update page history
          setPageHistory(prev => {
            const newHistory = prev.filter(h => h.page < page);
            return [...newHistory, { page, lastDoc: result.lastDoc }];
          });
        }

        // Force reload participant avatars
        setParticipantAvatars({});
        loadParticipantAvatars(updatedSplits);
      } else {
        logger.error('Failed to load splits', result.error, 'SplitsListScreen');
        Alert.alert('Error', result.error || 'Failed to load splits');
        setSplits([]);
      }
    } catch (error) {
      console.error('🔍 SplitsListScreen: Error loading splits:', error);
      Alert.alert('Error', 'Failed to load splits');
      setSplits([]);
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextPage = useCallback(() => {
    if (!isLoading && hasMore && currentUser?.id) {
      loadSplits(currentPage + 1, lastDoc);
    }
  }, [isLoading, hasMore, currentUser?.id, currentPage, lastDoc]);

  const goToPreviousPage = useCallback(() => {
    if (!isLoading && currentPage > 1 && currentUser?.id) {
      // Find the lastDoc for the previous page from history
      const prevPageHistory = pageHistory.find(h => h.page === currentPage - 1);
      const prevLastDoc = prevPageHistory?.lastDoc || null;
      
      // For page 1, we don't need lastDoc
      if (currentPage === 2) {
        loadSplits(1, undefined);
      } else if (prevLastDoc) {
        // We need to go back 2 pages to get the correct lastDoc
        const twoPagesBack = pageHistory.find(h => h.page === currentPage - 2);
        loadSplits(currentPage - 1, twoPagesBack?.lastDoc);
      } else {
        // Fallback: reload from beginning and navigate
        loadSplits(1, undefined);
        // Then navigate to the desired page
        setTimeout(() => {
          if (currentPage - 1 > 1) {
            // This is a simplified approach - in production, you might want to cache all pages
            loadSplits(currentPage - 1, undefined);
          }
        }, 100);
      }
    }
  }, [isLoading, currentPage, currentUser?.id, pageHistory]);

  // Swipe gesture handler - created after navigation functions are defined
  // Use refs to access latest values
  const currentPageRef = useRef(currentPage);
  const hasMoreRef = useRef(hasMore);
  
  useEffect(() => {
    currentPageRef.current = currentPage;
    hasMoreRef.current = hasMore;
  }, [currentPage, hasMore]);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        const swipeThreshold = 50; // Minimum swipe distance
        
        if (Math.abs(dx) > swipeThreshold) {
          if (dx > 0) {
            // Swipe right - go to previous page
            if (currentPageRef.current > 1) {
              goToPreviousPage();
            }
          } else {
            // Swipe left - go to next page
            if (hasMoreRef.current) {
              goToNextPage();
            }
          }
        }
      },
    })
  ).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'splits') {
    // Reset to page 1 on refresh
    setCurrentPage(1);
    setPageHistory([]);
    setLastDoc(null);
    await loadSplits(1, undefined);
    } else if (activeTab === 'sharedWallets') {
      await loadSharedWallets();
    }
    setRefreshing(false);
  }, [activeTab, loadSharedWallets]);


  const handleCreateSplit = useCallback(() => {
    try {
      // Navigate to camera screen for OCR-based split creation
      navigation.navigate('BillCamera');
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to camera:', err);
      Alert.alert('Navigation Error', 'Failed to open camera');
    }
  }, [navigation]);

  const handleCreateSharedWallet = useCallback(() => {
    try {
      navigation.navigate('CreateSharedWallet');
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to create shared wallet:', err);
      Alert.alert('Navigation Error', 'Failed to open create shared wallet screen');
    }
  }, [navigation]);

  const handleSharedWalletPress = useCallback((wallet: SharedWallet) => {
    try {
      logger.debug('Opening shared wallet', {
        walletId: wallet.id,
        name: wallet.name
      }, 'SplitsListScreen');
      
      navigation.navigate('SharedWalletDetails', {
        walletId: wallet.id,
        wallet: wallet,
      });
    } catch (err) {
      console.error('❌ SplitsListScreen: Error opening shared wallet:', err);
      Alert.alert('Error', 'Failed to open shared wallet');
    }
  }, [navigation]);



  const handleSplitPress = useCallback(async (split: Split) => {
    try {
      logger.debug('Opening split', {
        id: split.id,
        title: split.title,
        status: split.status,
        splitType: split.splitType
      });

      // Check if this is a completed degen split that should go to result screen
      if (split.splitType === 'degen' && split.walletId) {
        try {
          logger.debug('Checking degen split wallet status', { walletId: split.walletId }, 'SplitsListScreen');

          // Import SplitWalletService dynamically to avoid circular dependencies
          const { SplitWalletService } = await import('../../../services/split');
          const walletResult = await SplitWalletService.getSplitWallet(split.walletId);

          if (walletResult.success && walletResult.wallet) {
            const wallet = walletResult.wallet;
            logger.info('Wallet status check', {
              walletId: wallet.id,
              walletStatus: wallet.status,
              hasDegenWinner: !!wallet.degenWinner,
              degenWinner: wallet.degenWinner,
              currentUserId: currentUser?.id?.toString()
            });

            const baseParams = {
              splitData: split,
              billData: null,
              processedBillData: null,
              participants: split.participants,
              totalAmount: split.totalAmount,
              splitWallet: wallet,
            };

            if ((wallet.status === 'completed' || wallet.status === 'spinning_completed' || wallet.status === 'closed') && wallet.degenWinner) {
              navigation.navigate('DegenResult', {
                ...baseParams,
                selectedParticipant: {
                  id: wallet.degenWinner.userId,
                  name: wallet.degenWinner.name,
                  userId: wallet.degenWinner.userId
                }
              });
              return;
            }

            navigation.navigate('DegenLock', baseParams);
            return;
          }
        } catch (walletError) {
          console.error('🔍 SplitsListScreen: Error checking wallet status:', walletError);
          // Continue with normal navigation if wallet check fails
        }
      }

      // Debug: Log the split data being passed to navigation
      logger.info('Navigating to SplitDetails with split data', {
        splitId: split.id,
        splitTitle: split.title,
        splitObject: split,
        splitKeys: Object.keys(split),
        splitType: typeof split,
        hasParticipants: !!split.participants,
        participantsCount: split.participants?.length || 0,
        // Additional debugging
        splitStringified: JSON.stringify(split, null, 2),
        splitHasId: !!split.id,
        splitIdType: typeof split.id,
        splitIdValue: split.id
      });

      // Always navigate to SplitDetails first for consistent behavior
      // This ensures all splits (OCR and manual) follow the same flow
      // CRITICAL: Explicitly set isNewBill and isManualCreation to false for existing splits
      navigation.navigate('SplitDetails', {
        splitId: split.id,
        splitData: split,
        isEditing: false,
        isNewBill: false, // Explicitly mark as existing split
        isManualCreation: false, // Explicitly mark as existing split
      });
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to split details:', err);
      Alert.alert('Navigation Error', 'Failed to open split details');
    }
  }, [navigation, currentUser]);



  const renderSplitCard = (split: Split) => {
    // Use actual split data
    const splitAmount = split.totalAmount;
    const splitTitle = split.title;

    return (
      <TouchableOpacity
        key={split.id}
        style={styles.splitCard}
        onPress={() => handleSplitPress(split)}
        activeOpacity={0.7}
      >
        <View style={styles.splitHeader}>
          <View style={styles.splitHeaderLeft}>
            {/* Category Icon */}
            <GroupIcon
              category={split.category || 'trip'}
              size={48}
              style={styles.categoryIcon}
            />
            <View style={styles.splitTitleContainer}>
              <Text style={styles.splitTitle} numberOfLines={1}>
                {splitTitle}
              </Text>
              <View style={styles.roleContainer}>
                <Image 
                  source={split.creatorId === currentUser?.id 
                    ? require('../../../../assets/award-icon.png') 
                    : require('../../../../assets/user-icon.png')
                  }
                  style={styles.roleIcon}
                />
                <Text style={styles.createdBy}>
                  {split.creatorId === currentUser?.id ? 'Owner' : 'Member'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, getSplitStatusBadgeStyle(split.status)]}>
            <View style={[styles.splitCardDot, getSplitStatusDotStyle(split.status)]} />
            <Text style={[styles.statusText, getSplitStatusTextStyle(split.status)]}>
              {getSplitStatusDisplayText(split.status)}
            </Text>
          </View>
        </View>

        {/*<View style={styles.splitDetails}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amountValue}>
                ${splitAmount.toFixed(2)}
              </Text>
            </View>
          
          <View style={styles.participantsContainer}>
            <Text style={styles.participantsLabel}>Participants</Text>
            <Text style={styles.participantsValue}>
              {split.participants.filter(p => 
                p.status === 'accepted' || 
                p.status === 'paid' || 
                p.status === 'locked' ||
                p.userId === split.creatorId // Always include the creator
              ).length}/{split.participants.length}
            </Text>
          </View>

        </View> */}

        <View style={styles.splitCardBottom}>

          {/* Avatars des membres dynamiques */}
          <View style={styles.splitCardMembers}>
            <View style={styles.participantAvatars}>
              {split.participants.slice(0, 3).map((participant, index) => (
                <AvatarComponent
                  key={participant.userId}
                  userId={participant.userId}
                  avatar={participantAvatars[participant.userId]}
                  displayName={participant.name}
                  style={[
                    styles.participantAvatar,
                    index > 0 && styles.participantAvatarOverlap
                  ]}
                />
              ))}
              {split.participants.length > 3 && (
                <View style={[styles.participantAvatar, styles.participantAvatarOverlay]}>
                  <Text style={[styles.participantAvatarOverlayText]}>
                    +{split.participants.length - 3}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Image 
            source={require('../../../../assets/chevron-right.png')} 
            style={styles.splitCardArrow} 
          />
        </View>

        {/*<View style={styles.splitFooter}>

          <Text style={styles.createdAt}>
            {(() => {
              // Always use mockup data for consistency
              const { MockupDataService } = require('../../data/mockupData');
              return MockupDataService.getBillDate();
            })()}
          </Text>  
        </View>*/}

        {/* Wallet Information - Only show for creators */}
        {/*{split.creatorId === currentUser?.id && split.walletAddress && (
          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Split Wallet:</Text>
            <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
              {split.walletAddress}
            </Text>
          </View>
        )}*/}
      </TouchableOpacity>
    );
  };

  const getFilteredSplits = useCallback(() => {
    if (activeFilter === 'all') {
      return splits;
    }
    return splits.filter(split => {
      if (activeFilter === 'active') {
        // Include active, pending, draft, locked, and spinning_completed splits in "active" filter
        return split.status === 'active' || 
               split.status === 'pending' || 
               split.status === 'draft' ||
               split.status === 'locked' ||
               split.status === 'spinning_completed';
      }
      if (activeFilter === 'closed') {
        // Include completed, cancelled, and closed splits in "closed" filter
        return split.status === 'completed' || 
               split.status === 'cancelled' || 
               split.status === 'closed';
      }
      return true;
    });
  }, [splits, activeFilter]);

  const displaySplits = getFilteredSplits();

  return (
    <Container>

      <View 
        style={styles.scrollContainer}
        {...panResponder.panHandlers}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pools</Text>
          <TouchableOpacity
            style={styles.newPoolButton}
            onPress={activeTab === 'splits' ? handleCreateSplit : handleCreateSharedWallet}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newPoolButton}
            >
              <Icon name="plus" size={16} color={colors.black} />
              <Text style={styles.newPoolButtonText}>
                {activeTab === 'splits' ? 'New Pool' : 'New Wallet'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Top-Level Tabs: Splits | Shared Wallets */}
        <Tabs
          tabs={[
            { label: 'Splits', value: 'splits' },
            { label: 'Shared Wallets', value: 'sharedWallets' },
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab as 'splits' | 'sharedWallets');
            // Mark that user has manually changed the tab
            // This prevents route params from overriding user's choice
            userHasManuallyChangedTabRef.current = true;
            // Clear route params to prevent them from interfering
            if (navigation.setParams) {
              navigation.setParams({ activeTab: undefined });
            }
          }}
          enableAnimation={true}
        />

        {/* Filter Tabs - Only show when "Splits" tab is active */}
        {activeTab === 'splits' && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.8}
          >
            {activeFilter === 'all' ? (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterButton}
              >
                <Text style={styles.filterButtonTextActive}>
                  All
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterButton}>
                <Text style={styles.filterButtonText}>
                  All
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setActiveFilter('active')}
            activeOpacity={0.8}
          >
            {activeFilter === 'active' ? (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterButton}
              >
                <Text style={styles.filterButtonTextActive}>
                  Active
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterButton}>
                <Text style={styles.filterButtonText}>
                  Active
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setActiveFilter('closed')}
            activeOpacity={0.8}
          >
            {activeFilter === 'closed' ? (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterButton}
              >
                <Text style={styles.filterButtonTextActive}>
                  Closed
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterButton}>
                <Text style={styles.filterButtonText}>
                  Closed
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        )}

        {/* Page Indicator - Below filter tabs */}
        {activeTab === 'splits' && (hasMore || currentPage > 1) && displaySplits.length > 0 && (
          <View style={styles.pageIndicatorContainer}>
            <Text style={styles.pageIndicatorText}>
              Page {currentPage} of {totalPages}
            </Text>
          </View>
        )}

        {/* Content based on active tab */}
        {activeTab === 'splits' ? (
          /* Splits List */
          isLoading ? (
          <View style={styles.loadingContainer}>
            <ModernLoader size="large" text="Loading splits..." />
          </View>
        ) : splits.length === 0 ? (
          // Global empty state when there are no pools at all
          <View style={styles.emptyState}>
            <Image
              source={require('../../../../assets/pool-empty-icon.png')}
              style={styles.emptyStateIcon}
            />
            <View style={styles.emptyStateContent}>
              <Text style={styles.emptyStateTitle}>It's empty here</Text>
              <Text style={styles.emptyStateSubtitle}>
                Pools let you bring people together and share expenses seamlessly. Create one to kick things off!
              </Text>
            </View>
            <Button
              title="Create my first pool"
              onPress={handleCreateSplit}
              variant="primary"
              size="large"
              style={styles.createFirstButtonWrapper}
            />
          </View>
        ) : displaySplits.length === 0 ? (
          // Compact empty state for tabs (e.g., Closed) with no results
          <View style={styles.emptyTabState}>
            <Text style={styles.emptyTabText}>No pools found</Text>
          </View>
        ) : (
          <View>
            {displaySplits.map(renderSplitCard)}
          </View>
          )
        ) : (
          /* Shared Wallets List */
          isLoadingSharedWallets ? (
            <View style={styles.loadingContainer}>
              <ModernLoader size="large" text="Loading shared wallets..." />
            </View>
          ) : sharedWallets.length === 0 ? (
            <View style={styles.emptyState}>
              <Image
                source={require('../../../../assets/pool-empty-icon.png')}
                style={styles.emptyStateIcon}
              />
              <View style={styles.emptyStateContent}>
                <Text style={styles.emptyStateTitle}>No Shared Wallets</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Create a shared wallet to manage ongoing expenses with friends and family.
                </Text>
              </View>
              <Button
                title="Create Shared Wallet"
                onPress={handleCreateSharedWallet}
                variant="primary"
                size="large"
                style={styles.createFirstButtonWrapper}
              />
            </View>
          ) : (
            <View>
              {sharedWallets.map((wallet) => (
                <SharedWalletCard
                  key={wallet.id}
                  wallet={wallet}
                  currentUserId={currentUser?.id?.toString()}
                  onPress={handleSharedWalletPress}
                />
              ))}
            </View>
          )
        )}
        </ScrollView>
      </View>

      <NavBar currentRoute="SplitsList" navigation={navigation} />
    </Container>
  );
};


export default SplitsListScreen;
