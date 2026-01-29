/**
 * Splits List Screen
 * Main screen for viewing and managing bill splits
 * Renamed from GroupsListScreen to focus on bill splitting functionality
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styles';  
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import NavBar from '../../../components/shared/NavBar';
import Avatar from '../../../components/shared/Avatar';
import GroupIcon from '../../../components/GroupIcon';
import Icon from '../../../components/Icon';
import { Container, Button, ModernLoader, PhosphorIcon, TabSecondary } from '../../../components/shared';
import Tabs from '../../../components/shared/Tabs';
import CreateChoiceModal from '../../../components/shared/CreateChoiceModal';
import SharedWalletCard from '../../../components/SharedWalletCard';
import SharedWalletGridCard from '../../../components/SharedWalletGridCard';
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
  const [maxKnownPage, setMaxKnownPage] = useState(1); // Track the highest page we've reached with hasMore = true
  const [knownTotalPages, setKnownTotalPages] = useState<number | null>(null); // Track exact total pages when we reach the last page
  const [isLoadingCount, setIsLoadingCount] = useState(false); // Track if we're loading the total count
  const [hasLoadedCountOnce, setHasLoadedCountOnce] = useState(false); // Track if we've loaded count at least once
  // Shared wallets are now enabled in production
  const [activeTab, setActiveTab] = useState<'splits' | 'sharedWallets'>('splits'); // NEW: Top-level tab state
  const [sharedWallets, setSharedWallets] = useState<SharedWallet[]>([]);
  const [isLoadingSharedWallets, setIsLoadingSharedWallets] = useState(false);
  const [sharedWalletsError, setSharedWalletsError] = useState<string | null>(null); // Track errors to prevent infinite retries
  const [hasAttemptedLoadSharedWallets, setHasAttemptedLoadSharedWallets] = useState(false); // Track if we've attempted to load
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isOpeningSplit, setIsOpeningSplit] = useState(false);
  const SPLITS_PER_PAGE = 10;
  
  // Refs to prevent infinite loops
  const hasLoadedOnFocusRef = useRef(false);
  const hasLoadedSharedWalletsOnFocusRef = useRef(false); // Track if shared wallets loaded on focus
  const lastUserIdRef = useRef<string | null>(null);
  const lastRouteParamsRef = useRef<string>(''); // Track last route params to detect changes
  const userHasManuallyChangedTabRef = useRef(false); // Track if user manually changed tab
  
  // Calculate total pages - for "All" filter, use actual pagination
  // For other filters, calculate based on filtered results
  const totalPages = useMemo(() => {
    if (activeFilter === 'all') {
      // If we have a known total pages (from count query or reaching last page), use it
      if (knownTotalPages !== null) {
        return knownTotalPages;
      }
      
      // If we have totalSplits count, calculate from that
      if (totalSplits > 0) {
        return Math.ceil(totalSplits / SPLITS_PER_PAGE);
      }
      
      // If we're still loading the count, don't show "1/1" - estimate or return 0
      // This prevents showing incorrect "1/1" when we just haven't loaded the count yet
      if (isLoadingCount) {
        // While loading, if we have splits, estimate based on hasMore
        if (splits.length > 0) {
          if (hasMore) {
            return Math.max(currentPage + 1, 2); // At least 2 pages
          }
          if (splits.length === SPLITS_PER_PAGE) {
            return 2; // Likely at least 2 pages
          }
        }
        // Return 0 to indicate we're loading (will show "loading..." in UI)
        return 0;
      }
      
      // If count hasn't loaded yet and we're not loading, estimate based on hasMore
      if (hasMore) {
        // We know there's at least one more page beyond current
        const minFromCurrent = currentPage + 1;
        const minFromMaxKnown = maxKnownPage + 1;
        return Math.max(minFromCurrent, minFromMaxKnown, 2); // At least 2
      } else {
        // No more pages - we're on the last page
        // But if we haven't loaded count yet and have exactly SPLITS_PER_PAGE splits, might be more
        if (splits.length === SPLITS_PER_PAGE && totalSplits === 0) {
          return 2; // Likely at least 2 pages
        }
        // If we have fewer than SPLITS_PER_PAGE and no hasMore, this is likely the only page
        // But don't show "1/1" if we haven't loaded count - show at least 2 to be safe
        if (splits.length < SPLITS_PER_PAGE && totalSplits === 0) {
          return 1; // Only one page
        }
        return currentPage;
      }
    } else {
      // For filtered views, calculate based on filtered splits
      // Since filtering is client-side, we can't paginate filtered results
      // Just show all filtered splits (no pagination for filters)
      return 1;
    }
  }, [totalSplits, activeFilter, hasMore, currentPage, maxKnownPage, knownTotalPages, SPLITS_PER_PAGE, isLoadingCount, splits.length]);
  
  // Reset pagination when filter changes away from "All"
  // Keep pagination state when "All" is selected
  const prevFilterRef = useRef(activeFilter);
  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    prevFilterRef.current = activeFilter;
    
    // Only reset if switching away from "All" to a filtered view
    if (prevFilter === 'all' && activeFilter !== 'all' && currentPage > 1) {
      setCurrentPage(1);
      setPageHistory([]);
      setLastDoc(null);
      setMaxKnownPage(1);
      setKnownTotalPages(null);
      // Reload splits for the new filter (will show filtered results)
      if (currentUser?.id) {
        loadSplits(1, undefined);
      }
    }
    // If switching to "All" from a filter, reset pagination state
    if (prevFilter !== 'all' && activeFilter === 'all') {
      setCurrentPage(1);
      setPageHistory([]);
      setLastDoc(null);
        setMaxKnownPage(1);
        setKnownTotalPages(null);
        setHasLoadedCountOnce(false);
        // Reload to ensure we have the right data for "All" filter
        if (currentUser?.id) {
          // Reload count when switching to "All" filter
          loadTotalCount().then((count) => {
            loadSplits(1, undefined, count);
          });
        }
    }
  }, [activeFilter, currentUser?.id]); // Include currentUser?.id for loadSplits

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

  // Load total count on initial load
  const loadTotalCount = useCallback(async (): Promise<number> => {
    if (!currentUser?.id || isLoadingCount) {
      logger.debug('Skipping loadTotalCount', { 
        hasUser: !!currentUser?.id, 
        isLoadingCount 
      }, 'SplitsListScreen');
      return 0;
    }
    
    setIsLoadingCount(true);
    try {
      logger.info('Loading total splits count', { userId: currentUser.id }, 'SplitsListScreen');
      const count = await SplitStorageService.getUserSplitsCount(String(currentUser.id));
      setTotalSplits(count);
      const totalPages = count > 0 ? Math.ceil(count / SPLITS_PER_PAGE) : 1;
      setKnownTotalPages(totalPages);
      setHasLoadedCountOnce(true);
      logger.info('Total splits count loaded', { 
        count, 
        totalPages, 
        splitsPerPage: SPLITS_PER_PAGE 
      }, 'SplitsListScreen');
      return count;
    } catch (error) {
      logger.error('Failed to load total count', { 
        error: error instanceof Error ? error.message : String(error),
        userId: currentUser.id
      }, 'SplitsListScreen');
      setHasLoadedCountOnce(true); // Mark as attempted even on error
      return 0;
    } finally {
      setIsLoadingCount(false);
    }
  }, [currentUser?.id, SPLITS_PER_PAGE, isLoadingCount]);

  useEffect(() => {
    if (currentUser?.id) {
      // Check if user changed
      if (lastUserIdRef.current !== currentUser.id) {
        // Reset to page 1 when user changes
        setCurrentPage(1);
        setPageHistory([]);
        setLastDoc(null);
        setMaxKnownPage(1);
        setKnownTotalPages(null);
        setTotalSplits(0);
        setHasLoadedCountOnce(false);
        hasLoadedOnFocusRef.current = false;
        lastUserIdRef.current = currentUser.id;
        
        // Load total count first, then load splits with the count
        // This ensures we have the count before showing pagination
        (async () => {
          const count = await loadTotalCount();
          await loadSplits(1, undefined, count);
        })();
      } else if (!hasLoadedCountOnce && !isLoadingCount && splits.length === 0) {
        // If count hasn't been loaded yet and we have no splits, load both
        // This ensures count is always loaded on initial mount
        (async () => {
          const count = await loadTotalCount();
          await loadSplits(1, undefined, count);
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only depend on currentUser?.id to prevent infinite loops
  }, [currentUser?.id]);

  // Load shared wallets
  const loadSharedWallets = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    // Prevent reloading if already loading
    if (isLoadingSharedWallets) return;

    // Don't retry if we have a permission error - it won't resolve without fixing the rules
    if (sharedWalletsError && sharedWalletsError.includes('permissions')) {
      if (__DEV__) {
        logger.debug('Skipping shared wallets load due to permission error', { error: sharedWalletsError }, 'SplitsListScreen');
      }
      return;
    }

    setIsLoadingSharedWallets(true);
    setSharedWalletsError(null); // Clear previous errors on retry
    try {
      const result = await SharedWalletService.getUserSharedWallets(currentUser.id.toString());
      if (result.success && result.wallets) {
        setSharedWallets(result.wallets);
        setSharedWalletsError(null); // Clear any previous errors
        setHasAttemptedLoadSharedWallets(true);
        if (__DEV__) {
          logger.debug('Shared wallets loaded successfully', { 
            count: result.wallets.length,
            walletIds: result.wallets.map(w => w.id)
          }, 'SplitsListScreen');
        }
      } else {
        const errorMessage = result.error || 'Unknown error';
        logger.error('Failed to load shared wallets', { error: errorMessage }, 'SplitsListScreen');
        setSharedWalletsError(errorMessage);
        setHasAttemptedLoadSharedWallets(true);
        // Don't clear wallets on error - keep existing ones to prevent flickering
        // Only clear if we have no wallets yet
        setSharedWallets(prev => prev.length === 0 ? [] : prev);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error loading shared wallets', error, 'SplitsListScreen');
      setSharedWalletsError(errorMessage);
      setHasAttemptedLoadSharedWallets(true);
      // Don't clear wallets on error - keep existing ones to prevent flickering
      // Only clear if we have no wallets yet
      setSharedWallets(prev => prev.length === 0 ? [] : prev);
    } finally {
      setIsLoadingSharedWallets(false);
    }
  }, [currentUser?.id, isLoadingSharedWallets, sharedWalletsError]);

  // Handle route params to set active tab (e.g., when navigating from SharedWalletName or SharedWalletDetails)
  // Only apply if user hasn't manually changed the tab and route params have changed
  // Shared wallets tab is now available in production
  useEffect(() => {
    const currentRouteParams = route?.params || {};
    const routeParamsKey = JSON.stringify(currentRouteParams);
    let newInitialTab = currentRouteParams.activeTab as 'splits' | 'sharedWallets' | undefined;
    
    // Shared wallets are now enabled in production, so no need to override the tab
    
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
        hasLoadedSharedWalletsOnFocusRef.current = false; // Reset shared wallets focus load flag
        lastUserIdRef.current = currentUser.id;
        // Reset to page 1 when user changes
        setCurrentPage(1);
        setPageHistory([]);
        setLastDoc(null);
        setMaxKnownPage(1);
        setKnownTotalPages(null);
        // Reset manual tab change flag when user changes
        userHasManuallyChangedTabRef.current = false;
        lastRouteParamsRef.current = '';
        // Reset shared wallets state
        setHasAttemptedLoadSharedWallets(false);
        setSharedWalletsError(null);
      }
      
      // Always reload on focus to ensure we have the latest data
      // This is important when user creates a new split/wallet and navigates back
      if (__DEV__) {
        logger.debug('Screen focused, loading data for user', { userId: currentUser.id }, 'SplitsListScreen');
      }
      
      // Load splits if on splits tab
      if (activeTab === 'splits') {
        // Only reload if we haven't loaded yet (prevents infinite loops)
        if (!hasLoadedOnFocusRef.current) {
          // Clear avatar cache to force reload
          setParticipantAvatars({});
          // Reset pagination state to ensure fresh load
          setCurrentPage(1);
          setPageHistory([]);
          setLastDoc(null);
          setMaxKnownPage(1);
          setKnownTotalPages(null);
          // Always load total count first if not already loaded, then load page 1
          // This ensures we have the count before showing pagination
          if (totalSplits === 0 && !isLoadingCount) {
            loadTotalCount().then((count) => {
              loadSplits(1, undefined, count);
              hasLoadedOnFocusRef.current = true;
            });
          } else {
            loadSplits(1, undefined, totalSplits);
            hasLoadedOnFocusRef.current = true;
          }
        } else {
          // Already loaded, just ensure count is loaded if needed (don't reload splits to prevent loops)
          if (totalSplits === 0 && !isLoadingCount && !hasLoadedCountOnce) {
            loadTotalCount();
          }
        }
      } else if (activeTab === 'sharedWallets') {
        // Load shared wallets if on shared wallets tab
        // Only load once per focus to prevent infinite loops
        // Similar to splits - only reload if we haven't loaded on this focus yet
        if (!hasLoadedSharedWalletsOnFocusRef.current) {
          // Don't load if we have a permission error - it won't resolve without fixing rules
          if (!sharedWalletsError || !sharedWalletsError.includes('permissions')) {
        loadSharedWallets();
            hasLoadedSharedWalletsOnFocusRef.current = true;
      }
        }
      }
    }, [currentUser?.id, activeTab, hasAttemptedLoadSharedWallets, sharedWalletsError, loadSharedWallets])
  );


  // Load shared wallets when tab changes to sharedWallets
  // Only load if we don't already have wallets and haven't encountered a permission error
  useEffect(() => {
    if (
      activeTab === 'sharedWallets' && 
      currentUser?.id && 
      sharedWallets.length === 0 && 
      !isLoadingSharedWallets &&
      !hasAttemptedLoadSharedWallets // Only attempt once unless manually refreshed
    ) {
      loadSharedWallets();
    }
  }, [activeTab, currentUser?.id, loadSharedWallets, sharedWallets.length, isLoadingSharedWallets, hasAttemptedLoadSharedWallets]);

  // Load participant avatars when splits change
  useEffect(() => {
    if (splits.length > 0) {
      loadParticipantAvatars(splits);
    }
  }, [splits, loadParticipantAvatars]);

  const loadSplits = async (page: number = 1, lastDocument?: any, totalCount?: number) => {
    if (!currentUser?.id) {
      logger.debug('No current user, skipping load', null, 'SplitsListScreen');
      return;
    }

    setIsLoading(true);

    try {
      if (__DEV__) {
        logger.debug('Loading splits for user', { userId: currentUser.id, page, totalCount }, 'SplitsListScreen');
      }

      // Log to verify we're using the correct page size
      if (__DEV__) {
        console.log('🔍 Loading splits with SPLITS_PER_PAGE:', SPLITS_PER_PAGE);
      }

      const result = await SplitStorageService.getUserSplits(
        String(currentUser.id),
        SPLITS_PER_PAGE,
        page,
        lastDocument,
        totalCount
      );

      if (result.success && result.splits) {
        if (__DEV__) {
          console.log('🔍 Loaded splits count:', result.splits.length, 'Expected:', SPLITS_PER_PAGE);
          logger.debug('Loaded splits', {
            count: result.splits.length,
            expectedCount: SPLITS_PER_PAGE,
            hasMore: result.hasMore,
            page: result.currentPage,
            willShowPagination: result.hasMore || result.currentPage > 1
          }, 'SplitsListScreen');
        }

        // OPTIMIZED: Apply price updates synchronously (fast operation)
        // Defer wallet checks and status fixes to background to show splits immediately
        const updatedSplits = result.splits.map((split) => {
          // Get authoritative price from centralized price management (synchronous, fast)
          const billId = split.billId || split.id;
          const authoritativePrice = priceManagementService.getBillPrice(billId);

          // Update price if authoritative price is available
          if (authoritativePrice) {
            return {
              ...split,
              totalAmount: authoritativePrice.amount
            };
          }
          return split;
        });

        // Set splits immediately to show UI quickly
        setSplits(updatedSplits);
        
        // Perform background updates asynchronously (don't block UI)
        // This includes wallet status checks and creator status fixes
        Promise.all(updatedSplits.map(async (split) => {
          try {
            // Only check wallet status for degen splits that might need syncing
            // Skip if already completed to avoid unnecessary checks
            if (split.splitType === 'degen' && split.walletId && split.status !== 'completed') {
              try {
                const { SplitWalletService } = await import('../../../services/split');
                const walletResult = await SplitWalletService.getSplitWallet(split.walletId);
                
                if (walletResult.success && walletResult.wallet) {
                  const wallet = walletResult.wallet;
                  
                  // Only sync if wallet is closed but split isn't marked completed
                  if (wallet.status === 'closed' && split.status !== 'completed') {
                    logger.info('Syncing split status from closed wallet (background)', {
                      splitId: split.id,
                      walletId: wallet.id
                    }, 'SplitsListScreen');
                    
                    try {
                      const { SplitWalletService } = await import('../../../services/split');
                      await SplitWalletService.syncSplitStatusFromSplitWalletToSplitStorage(
                        split.billId,
                        'closed',
                        wallet.completedAt
                      );
                      
                      // Update local state after sync
                      setSplits(prev => prev.map(s => 
                        s.id === split.id ? { ...s, status: 'completed' as const } : s
                      ));
                    } catch (syncError) {
                      logger.error('Failed to sync split status from wallet (background)', {
                        splitId: split.id,
                        error: syncError instanceof Error ? syncError.message : String(syncError)
                      }, 'SplitsListScreen');
                    }
                  }
                }
              } catch (walletError) {
                // Silently fail - wallet check is non-critical for list display
                logger.debug('Could not check wallet status for split (background)', {
                  splitId: split.id,
                  walletId: split.walletId
                }, 'SplitsListScreen');
              }
            }

            // Fix creator status in background (non-blocking)
            const creatorParticipant = split.participants.find(p => p.userId === split.creatorId);
            if (creatorParticipant && creatorParticipant.status === 'pending') {
              try {
                await SplitStorageService.updateParticipantStatus(
                  split.firebaseDocId || split.id,
                  split.creatorId,
                  'accepted'
                );
                
                // Update local state after fix
                setSplits(prev => prev.map(s => {
                  if (s.id === split.id) {
                    const updatedParticipants = s.participants.map(p =>
                      p.userId === split.creatorId ? { ...p, status: 'accepted' as const } : p
                    );
                    return { ...s, participants: updatedParticipants };
                  }
                  return s;
                }));
              } catch (error) {
                // Silently fail - status fix is non-critical for list display
                logger.debug('Could not fix creator status (background)', {
                  splitId: split.id
                }, 'SplitsListScreen');
              }
            }
          } catch (error) {
            // Silently fail - background updates shouldn't block UI
            logger.debug('Background update failed for split', {
              splitId: split.id
            }, 'SplitsListScreen');
          }
        })).catch(error => {
          // Log but don't block - background updates failed
          logger.debug('Some background updates failed', { error }, 'SplitsListScreen');
        });

        // Splits already set above for immediate display
        // hasMore is true if we got exactly SPLITS_PER_PAGE splits (meaning there might be more)
        const calculatedHasMore = result.hasMore !== undefined ? result.hasMore : (updatedSplits.length === SPLITS_PER_PAGE);
        setHasMore(calculatedHasMore);
        setCurrentPage(page);
        
        // Update total splits count if provided in result
        if (result.totalCount !== undefined) {
          setTotalSplits(result.totalCount);
          if (result.totalPages !== undefined) {
            setKnownTotalPages(result.totalPages);
          }
        }
        
        // Track maximum known page when hasMore is true
        if (calculatedHasMore && page > maxKnownPage) {
          setMaxKnownPage(page);
        }
        
        // If we've reached the last page (hasMore = false), we know the exact total
        // This is the most accurate count - always use this once we know it
        if (!calculatedHasMore && result.totalCount === undefined) {
          // Calculate exact total: (previous pages * items per page) + current page items
          const exactTotal = (page - 1) * SPLITS_PER_PAGE + updatedSplits.length;
          setTotalSplits(exactTotal);
          const exactTotalPages = page;
          setKnownTotalPages(exactTotalPages);
          logger.info('Reached last page, setting known total', {
            page,
            exactTotal,
            exactTotalPages,
          }, 'SplitsListScreen');
        }
        
        // Update total splits count for page calculation
        // Only update totalSplits when we have definitive information:
        // 1. From result.totalCount (most accurate)
        // 2. On page 1 when we know it's all splits (no hasMore)
        // 3. When we reach the last page (handled above)
        // DO NOT recalculate on subsequent pages as it causes the count to change
        if (page === 1 && !calculatedHasMore) {
          // This is all the splits - we know the exact total
          setTotalSplits(updatedSplits.length);
        }
        // Note: We don't update totalSplits for subsequent pages unless we have result.totalCount
        // or we've reached the last page, to prevent the count from changing when navigating
        
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
    if (!isLoading && hasMore && currentUser?.id && activeFilter === 'all') {
      logger.info('Navigating to next page', {
        currentPage,
        nextPage: currentPage + 1,
        hasMore,
        totalSplits,
        knownTotalPages,
      }, 'SplitsListScreen');
      // Prevent useFocusEffect from resetting by marking as loaded
      hasLoadedOnFocusRef.current = true;
      loadSplits(currentPage + 1, lastDoc, totalSplits);
    } else if (!hasMore) {
      logger.debug('Cannot go to next page: no more splits', {
        currentPage,
        hasMore,
      }, 'SplitsListScreen');
    }
  }, [isLoading, hasMore, currentUser?.id, currentPage, lastDoc, activeFilter, totalSplits, knownTotalPages]);

  const goToPreviousPage = useCallback(() => {
    if (!isLoading && currentPage > 1 && currentUser?.id && activeFilter === 'all') {
      logger.info('Navigating to previous page', {
        currentPage,
        previousPage: currentPage - 1,
      }, 'SplitsListScreen');
      
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
  }, [isLoading, currentPage, currentUser?.id, pageHistory, activeFilter]);

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
    setMaxKnownPage(1);
    setKnownTotalPages(null);
    // Reload total count on refresh
    const count = await loadTotalCount();
    await loadSplits(1, undefined, count);
    } else if (activeTab === 'sharedWallets') {
      // Reset error state on manual refresh to allow retry
      setSharedWalletsError(null);
      setHasAttemptedLoadSharedWallets(false);
      hasLoadedSharedWalletsOnFocusRef.current = false; // Reset focus flag to allow reload
      await loadSharedWallets();
    }
    setRefreshing(false);
  }, [activeTab, loadSharedWallets, loadTotalCount]);


  const handleCreateSplit = useCallback(() => {
    try {
      // Navigate to camera screen for OCR-based split creation
      navigation.navigate('BillCamera');
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to camera:', err);
      Alert.alert('Navigation Error', 'Failed to open camera');
    }
  }, [navigation]);

  const handleOpenCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleCreateSharedWallet = useCallback(() => {
    try {
      navigation.navigate('SharedWalletName');
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



  // Handle split deletion
  const handleDeleteSplit = useCallback(async (split: Split) => {
    // Only allow deletion if user is the creator
    if (split.creatorId !== currentUser?.id) {
      Alert.alert(
        'Cannot Delete',
        'Only the split creator can delete this split.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if split has active payments or is locked
    if (split.status === 'locked' || split.status === 'active') {
      Alert.alert(
        'Cannot Delete',
        'This split is active and cannot be deleted. Please complete or cancel it first.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Split',
      `Are you sure you want to delete "${split.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await SplitStorageService.deleteSplit(split.id);
              
              if (result.success) {
                logger.info('Split deleted successfully', { splitId: split.id }, 'SplitsListScreen');
                
                // Remove from local state
                setSplits(prevSplits => prevSplits.filter(s => s.id !== split.id));
                
                // Recalculate total splits
                setTotalSplits(prev => Math.max(0, prev - 1));
                
                Alert.alert('Success', 'Split deleted successfully.');
              } else {
                logger.error('Failed to delete split', { 
                  splitId: split.id, 
                  error: result.error 
                }, 'SplitsListScreen');
                Alert.alert('Error', result.error || 'Failed to delete split. Please try again.');
              }
            } catch (error) {
              logger.error('Error deleting split', {
                splitId: split.id,
                error: error instanceof Error ? error.message : String(error),
              }, 'SplitsListScreen');
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [currentUser?.id]);

  const handleSplitPress = useCallback(async (split: Split) => {
    // Prevent multiple rapid taps while a split is opening
    if (isOpeningSplit) {
      return;
    }

    // Set a lightweight loading state immediately so the UI can render
    setIsOpeningSplit(true);

    const openSplit = async () => {
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

          // ✅ OPTIMIZATION: Use cached wallet data first for faster navigation
          // Import SplitWalletService dynamically to avoid circular dependencies
          const { SplitWalletService } = await import('../../../services/split');
          // getSplitWallet uses cache internally, so this should be fast
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

      // Debug: Log the split data being passed to navigation (avoid huge payloads in production)
      if (__DEV__) {
        logger.info('Navigating to SplitDetails with split data', {
          splitId: split.id,
          splitTitle: split.title,
          splitKeys: Object.keys(split),
          hasParticipants: !!split.participants,
          participantsCount: split.participants?.length || 0,
        });
      } else {
        logger.info('Navigating to SplitDetails', {
          splitId: split.id,
          splitTitle: split.title,
        });
      }

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
    } finally {
      // If this screen is still mounted, clear the loading state.
      // When navigation succeeds, the screen usually unmounts and this no-ops.
      setIsOpeningSplit(false);
    }
    };

    // Defer heavy work (dynamic imports, wallet checks) to the next tick so the
    // lightweight loading overlay can render first.
    setTimeout(openSplit, 0);
  }, [navigation, currentUser, isOpeningSplit]);



  const renderSplitCard = (split: Split) => {
    // Use actual split data
    const splitAmount = split.totalAmount;
    const splitTitle = split.title;

    // Render delete action (right swipe) - available for all splits
    // Validation will happen in handleDeleteSplit
    const renderRightActions = (progress: any) => {
      const trans = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0],
      });

      return (
        <Animated.View
          style={[
            styles.deleteActionContainer,
            {
              transform: [{ translateX: trans }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => handleDeleteSplit(split)}
            activeOpacity={0.8}
          >
            <View style={styles.deleteActionContent}>
              <Icon name="trash" size={24} color={colors.white} />
              <Text style={styles.deleteText}>Delete</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <Swipeable
        key={split.id}
        renderRightActions={renderRightActions}
        enabled={true}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          style={styles.splitCard}
          onPress={() => handleSplitPress(split)}
          activeOpacity={0.7}
        >
        <View style={styles.splitHeader}>
          <View style={styles.splitHeaderLeft}>
            {/* Category Icon */}
            {split.splitType === 'spend' ? (
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fpartners%2Fsp3nd-icon.png?alt=media&token=3b2603eb-57cb-4dc6-aafd-0fff463f1579' }}
                style={[styles.categoryIcon, styles.spendIcon]}
                resizeMode="contain"
              />
            ) : (
              <GroupIcon
                category={split.category || 'trip'}
                size={48}
                style={styles.categoryIcon}
              />
            )}
            <View style={styles.splitTitleContainer}>
              <Text style={styles.splitTitle} numberOfLines={1}>
                {splitTitle}
              </Text>
              <View style={styles.roleContainer}>
                {split.creatorId === currentUser?.id ? (
                  <PhosphorIcon
                    name="Medal"
                    size={16}
                    color={colors.white70}
                    style={styles.roleIcon}
                  />
                ) : (
                  <PhosphorIcon
                    name="User"
                    size={16}
                    color={colors.white70}
                    style={styles.roleIcon}
                  />
                )}
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

          <PhosphorIcon 
            name="ChevronRight" 
            size={20}
            color={colors.white70}
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
      </Swipeable>
    );
  };

  const getFilteredSplits = useCallback(() => {
    // For "All" filter, return all loaded splits (pagination handles loading more)
    if (activeFilter === 'all') {
      return splits;
    }
    // For other filters, filter the loaded splits client-side
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
            onPress={activeTab === 'splits' ? handleOpenCreateModal : handleCreateSharedWallet}
            activeOpacity={0.8}
          >
              <PhosphorIcon name="Plus" size={16} color={colors.white} weight="bold" />
              
          </TouchableOpacity>
        </View>

        {/* Top-Level Tabs: Splits | Shared Wallets */}
        {/* Shared Wallets tab only visible in dev mode */}
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
          <View style={{ marginTop: spacing.sm }}>
            <TabSecondary
              tabs={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Closed', value: 'closed' },
              ]}
              activeTab={activeFilter}
              onTabChange={(tab) => setActiveFilter(tab as 'all' | 'active' | 'closed')}
            />
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
            <PhosphorIcon
              name="Package"
              size={64}
              color={colors.white70}
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
            
            {/* Pagination Buttons - Only show for "All" filter when there are multiple pages or loading count */}
            {activeTab === 'splits' && activeFilter === 'all' && splits.length > 0 && (hasMore || currentPage > 1 || totalPages > 1 || (isLoadingCount && totalSplits === 0)) && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  onPress={goToPreviousPage}
                  disabled={isLoading || currentPage <= 1}
                  activeOpacity={0.6}
                  style={styles.paginationButtonTouchable}
                >
                  <PhosphorIcon
                    name="CaretLeft"
                    size={20}
                    color={isLoading || currentPage <= 1 ? colors.white50 : colors.white}
                  />
                </TouchableOpacity>
                <View style={styles.pageInfo}>
                  <Text style={styles.pageText}>
                    {(() => {
                      // If we're loading the count and don't have it yet, show loading
                      if (isLoadingCount && totalSplits === 0 && knownTotalPages === null) {
                        return `Page ${currentPage} (loading...)`;
                      }
                      // If we have known total pages, use it
                      if (knownTotalPages !== null) {
                        return `Page ${currentPage} of ${knownTotalPages}`;
                      }
                      // If we have totalSplits count, calculate and show
                      if (totalSplits > 0) {
                        const calculated = Math.ceil(totalSplits / SPLITS_PER_PAGE);
                        return `Page ${currentPage} of ${calculated}`;
                      }
                      // If totalPages is 0 (loading), show loading
                      if (totalPages === 0) {
                        return `Page ${currentPage} (loading...)`;
                      }
                      // If we have hasMore, show estimate
                      if (hasMore) {
                        return `Page ${currentPage} (more available)`;
                      }
                      // Fallback: show current calculation
                      return `Page ${currentPage} of ${totalPages}`;
                    })()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={goToNextPage}
                  disabled={isLoading || !hasMore}
                  activeOpacity={0.6}
                  style={styles.paginationButtonTouchable}
                >
                  <PhosphorIcon
                    name="CaretRight"
                    size={20}
                    color={isLoading || !hasMore ? colors.white50 : colors.white}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
          )
        ) : (
          /* Shared Wallets List */
          isLoadingSharedWallets ? (
            <View style={styles.loadingContainer}>
              <ModernLoader size="large" text="Loading shared wallets..." />
            </View>
          ) : sharedWallets.length === 0 ? (
            <View style={styles.sharedWalletEmptyState}>
              <View style={styles.sharedWalletEmptyContent}>
                <Text style={styles.sharedWalletEmptyTitle}>No Shared Wallets</Text>
                <Text style={styles.sharedWalletEmptySubtitle}>
                  Shared wallets allow you to manage ongoing expenses with friends and family.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.sharedWalletGrid}>
              {sharedWallets.map((wallet, index) => (
                <SharedWalletGridCard
                  key={wallet.id}
                  wallet={wallet}
                  onPress={handleSharedWalletPress}
                  colorIndex={index}
                />
              ))}
            </View>
          )
        )}
        </ScrollView>
      </View>

      {/* Lightweight overlay while a split is opening to avoid "frozen" feel during bundling */}
      {isOpeningSplit && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <ModernLoader size="large" text="Opening split..." />
        </View>
      )}

      {/* Create Choice Modal */}
      {activeTab === 'splits' && (
        <CreateChoiceModal
          visible={showCreateModal}
          onClose={handleCloseCreateModal}
          onCreateSplit={handleCreateSplit}
          onCreateSharedWallet={handleCreateSharedWallet}
        />
      )}

      <NavBar currentRoute="SplitsList" navigation={navigation} />
    </Container>
  );
};


export default SplitsListScreen;
