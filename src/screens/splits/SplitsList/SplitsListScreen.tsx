/**
 * Splits List Screen
 * Main screen for viewing and managing bill splits
 * Renamed from GroupsListScreen to focus on bill splitting functionality
 */

import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styles';  
import { colors } from '../../../theme/colors';
import NavBar from '../../../components/shared/NavBar';
import UserAvatar from '../../../components/UserAvatar';
import GroupIcon from '../../../components/GroupIcon';
import Icon from '../../../components/Icon';
import { Container } from '../../../components/shared';
import { BillSplitSummary } from '../../../types/billSplitting';
import { splitStorageService, Split, SplitStorageService } from '../../../services/splits';
import { logger } from '../../../services/analytics/loggingService';
import { MockupDataService } from '../../../services/data';
import { priceManagementService } from '../../../services/core';
import { useApp } from '../../../context/AppContext';
import { firebaseDataService } from '../../../services/data';


interface SplitsListScreenProps {
  navigation: any;
}

// Avatar component wrapper for backward compatibility
const AvatarComponent = ({ avatar, displayName, style }: { avatar?: string, displayName: string, style: any }) => {
  return (
    <UserAvatar
      avatarUrl={avatar}
      displayName={displayName}
      style={style}
    />
  );
};

const SplitsListScreen: React.FC<SplitsListScreenProps> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;

  const [splits, setSplits] = useState<Split[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [participantAvatars, setParticipantAvatars] = useState<Record<string, string>>({});

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

      // Fetch user profiles in parallel
      const avatarPromises = Array.from(userIds).map(async (userId) => {
        try {
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
    } catch (error) {
      console.error('Error loading participant avatars:', error);
    }
  }, []);

  // Test pool for design (removed hardcoded data)

  useEffect(() => {
    if (currentUser?.id) {
      loadSplits();
    }
  }, [currentUser?.id]);

  // Refresh splits when screen comes into focus (e.g., after joining a split)
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        if (__DEV__) {
          logger.debug('Screen focused, refreshing splits for user', { userId: currentUser.id }, 'SplitsListScreen');
        }
        loadSplits();
      }
    }, [currentUser?.id])
  );

  // Load participant avatars when splits change
  useEffect(() => {
    if (splits.length > 0) {
      loadParticipantAvatars(splits);
    }
  }, [splits, loadParticipantAvatars]);

  const loadSplits = async () => {
    if (!currentUser?.id) {
      logger.debug('No current user, skipping load', null, 'SplitsListScreen');
      return;
    }

    setIsLoading(true);
    try {
      logger.debug('Loading splits for user', { userId: currentUser.id }, 'SplitsListScreen');

      const result = await SplitStorageService.getUserSplits(String(currentUser.id));

      if (result.success && result.splits) {
        logger.debug('Loaded splits', {
          count: result.splits.length,
          splits: result.splits.map(s => ({
            id: s.id,
            title: s.title,
            status: s.status,
            splitType: s.splitType,
            totalAmount: s.totalAmount,
            date: s.date,
            createdAt: s.createdAt,
            participantsCount: s.participants.length,
            participants: s.participants.map(p => ({
              userId: p.userId,
              name: p.name,
              status: p.status
            }))
          }))
        });

        // Fix existing splits where creator has 'pending' status and validate prices
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

        // Load participant avatars
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSplits();
    setRefreshing(false);
  }, []);


  const handleCreateSplit = useCallback(() => {
    try {
      navigation.navigate('BillCamera');
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to camera:', err);
      Alert.alert('Navigation Error', 'Failed to open camera');
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
          const { SplitWalletService } = await import('../../services/split');
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

            // If the degen split is completed and has a winner, navigate to result screen
            if ((wallet.status === 'completed' || wallet.status === 'spinning_completed') && wallet.degenWinner) {
              logger.info('Navigating to DegenResult for completed split', null, 'SplitsListScreen');

              // Find the winner participant
              const winnerParticipant = split.participants.find(p => p.userId === wallet.degenWinner?.userId);

              if (winnerParticipant) {
                // Convert participants to unified format
                const unifiedParticipants = split.participants.map((p: any) => ({
                  id: p.userId,
                  name: p.name,
                  walletAddress: p.walletAddress,
                  status: p.status,
                  amountOwed: p.amountOwed,
                  amountPaid: p.amountPaid || 0,
                  userId: p.userId,
                  email: p.email || '',
                  items: [],
                }));

                // Create unified bill data
                const unifiedBillData = {
                  id: split.billId || split.id,
                  title: split.title,
                  totalAmount: split.totalAmount,
                  currency: split.currency || 'USDC',
                  date: split.date,
                  merchant: split.merchant?.name || 'Unknown Merchant',
                  location: split.merchant?.address || 'Unknown Location',
                  participants: unifiedParticipants,
                };

                navigation.navigate('DegenResult', {
                  billData: unifiedBillData,
                  participants: unifiedParticipants,
                  totalAmount: split.totalAmount,
                  selectedParticipant: winnerParticipant,
                  splitWallet: wallet,
                  splitData: split,
                });
                return;
              }
            }
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
      navigation.navigate('SplitDetails', {
        splitId: split.id,
        splitData: split,
        isEditing: false
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

          <View style={[styles.statusBadge, getStatusBadgeStyle(split.status)]}>
            <View style={[styles.splitCardDot, getStatusDotStyle(split.status)]} />
            <Text style={[styles.statusText, getStatusTextStyle(split.status)]}>
              {split.status}
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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { backgroundColor: colors.green + '20' };
      case 'completed':
        return { backgroundColor: colors.success + '20' };
      case 'pending':
        return { backgroundColor: colors.warning + '20' };
      case 'draft':
        return { backgroundColor: colors.textSecondary + '20' };
      default:
        return { backgroundColor: colors.surface };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { color: colors.green };
      case 'completed':
        return { color: colors.success };
      case 'pending':
        return { color: colors.warning };
      case 'draft':
        return { color: colors.textSecondary };
      default:
        return { color: colors.text };
    }
  };

  const getStatusDotStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { backgroundColor: colors.green };
      case 'completed':
        return { backgroundColor: colors.success };
      case 'pending':
        return { backgroundColor: colors.warning };
      case 'draft':
        return { backgroundColor: colors.textSecondary };
      default:
        return { backgroundColor: colors.text };
    }
  };

  const getFilteredSplits = useCallback(() => {
    if (activeFilter === 'all') {
      return splits;
    }
    return splits.filter(split => {
      if (activeFilter === 'active') {
        return split.status === 'active';
      }
      if (activeFilter === 'closed') {
        return split.status === 'completed' || split.status === 'cancelled';
      }
      return true;
    });
  }, [splits, activeFilter]);

  const displaySplits = getFilteredSplits();

  return (
    <Container>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pools</Text>
          <TouchableOpacity
            style={styles.newPoolButton}
            onPress={handleCreateSplit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newPoolButton}
            >
              <Icon name="plus" size={16} color={colors.black} />
              <Text style={styles.newPoolButtonText}>New Pool</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
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

        {/* Splits List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Loading splits...</Text>
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
            <TouchableOpacity
              style={styles.createFirstButtonWrapper}
              onPress={handleCreateSplit}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createFirstButton}
              >
                <Text style={styles.createFirstButtonText}>Create my first pool</Text>
              </LinearGradient>
            </TouchableOpacity>
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
        )}
      </ScrollView>

      <NavBar currentRoute="SplitsList" navigation={navigation} />
    </Container>
  );
};


export default SplitsListScreen;
