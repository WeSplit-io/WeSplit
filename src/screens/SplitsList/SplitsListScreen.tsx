/**
 * Splits List Screen
 * Main screen for viewing and managing bill splits
 * Renamed from GroupsListScreen to focus on bill splitting functionality
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import NavBar from '../../components/NavBar';
import UserAvatar from '../../components/UserAvatar';
import { BillSplitSummary } from '../../types/billSplitting';
import { SplitStorageService, Split } from '../../services/splitStorageService';
import { priceManagementService } from '../../services/priceManagementService';
import { useApp } from '../../context/AppContext';

type FilterType = 'all' | 'pending' | 'completed' | 'draft';

interface SplitsListScreenProps {
  navigation: any;
}

const SplitsListScreen: React.FC<SplitsListScreenProps> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [splits, setSplits] = useState<Split[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      loadSplits();
    }
  }, [currentUser?.id]);

  const loadSplits = async () => {
    if (!currentUser?.id) {
      console.log('🔍 SplitsListScreen: No current user, skipping load');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 SplitsListScreen: Loading splits for user:', currentUser.id);
      
      const result = await SplitStorageService.getUserSplits(currentUser.id);
      
      if (result.success && result.splits) {
        console.log('🔍 SplitsListScreen: Loaded splits:', {
          count: result.splits.length,
          splits: result.splits.map(s => ({
            id: s.id,
            title: s.title,
            status: s.status,
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
            console.log('💰 SplitsListScreen: Using authoritative price for split:', {
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
            console.log('🔍 SplitsListScreen: Fixing creator status for split:', updatedSplit.id);
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
        
        setSplits(updatedSplits);
      } else {
        console.log('🔍 SplitsListScreen: Failed to load splits:', result.error);
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

  const getFilteredSplits = useCallback(() => {
    if (activeFilter === 'all') {
      return splits;
    }
    return splits.filter(split => split.status === activeFilter);
  }, [splits, activeFilter]);

  const handleCreateSplit = useCallback(() => {
    try {
      navigation.navigate('BillCamera');
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to camera:', err);
      Alert.alert('Navigation Error', 'Failed to open camera');
    }
  }, [navigation]);

  const handleSplitPress = useCallback((split: Split) => {
    try {
      console.log('🔍 SplitsListScreen: Opening split:', {
        id: split.id,
        title: split.title,
        status: split.status
      });
      
      // Navigate to split details screen
      navigation.navigate('SplitDetails', {
        splitId: split.id,
        splitData: split,
        isEditing: false
      });
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to split details:', err);
      Alert.alert('Navigation Error', 'Failed to open split details');
    }
  }, [navigation]);

  const renderFilterButton = (filter: FilterType, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSplitCard = (split: Split) => (
    <TouchableOpacity
      key={split.id}
      style={styles.splitCard}
      onPress={() => handleSplitPress(split)}
      activeOpacity={0.7}
    >
      <View style={styles.splitHeader}>
        <View style={styles.splitTitleContainer}>
          <Text style={styles.splitTitle} numberOfLines={1}>
            {split.title}
          </Text>
          <Text style={styles.splitDate}>
            {split.date ? (() => {
              try {
                const date = new Date(split.date);
                if (isNaN(date.getTime())) {
                  return 'Invalid Date';
                }
                return date.toLocaleDateString();
              } catch (error) {
                console.warn('🔍 SplitsListScreen: Error parsing date:', split.date, error);
                return 'Invalid Date';
              }
            })() : 'No Date'}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, getStatusBadgeStyle(split.status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(split.status)]}>
            {split.status}
          </Text>
        </View>
      </View>
      
        <View style={styles.splitDetails}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>
              ${split.totalAmount.toFixed(2)}
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
        </View>
        
        {/* Participant Avatars */}
        {split.participants.length > 0 && (
          <View style={styles.participantAvatarsContainer}>
            <Text style={styles.participantAvatarsLabel}>Participants:</Text>
            <View style={styles.participantAvatars}>
              {split.participants.slice(0, 4).map((participant, index) => (
                <UserAvatar
                  key={participant.userId}
                  userId={participant.userId}
                  userName={participant.name}
                  size={32}
                  style={[
                    styles.participantAvatar,
                    index > 0 && styles.participantAvatarOverlap
                  ]}
                />
              ))}
              {split.participants.length > 4 && (
                <View style={[styles.participantAvatar, styles.participantAvatarOverlay]}>
                  <Text style={styles.participantAvatarOverlayText}>
                    +{split.participants.length - 4}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      
      <View style={styles.splitFooter}>
        <Text style={styles.createdBy}>
          {split.creatorId === currentUser?.id ? 'Created by you' : `Created by ${split.creatorName}`}
        </Text>
        <Text style={styles.createdAt}>
          {split.createdAt ? (() => {
            try {
              const date = new Date(split.createdAt);
              if (isNaN(date.getTime())) {
                return 'Invalid Date';
              }
              return date.toLocaleDateString();
            } catch (error) {
              console.warn('🔍 SplitsListScreen: Error parsing createdAt:', split.createdAt, error);
              return 'Invalid Date';
            }
          })() : 'No Date'}
        </Text>
      </View>
      
      {/* Wallet Information - Only show for creators */}
      {split.creatorId === currentUser?.id && split.walletAddress && (
        <View style={styles.walletInfo}>
          <Text style={styles.walletLabel}>Split Wallet:</Text>
          <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
            {split.walletAddress}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { backgroundColor: colors.primary + '20' };
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
        return { color: colors.primary };
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

  const displaySplits = getFilteredSplits();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bill Splits</Text>
          <Text style={styles.headerSubtitle}>
            Manage your shared expenses
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateSplit}
          >
            <View style={styles.createButtonIcon}>
              <Text style={styles.createButtonIconText}>📷</Text>
            </View>
            <Text style={styles.createButtonText}>Capture Bill</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              // TODO: Navigate to manual split creation
              Alert.alert('Manual Split', 'Manual split creation coming soon!');
            }}
          >
            <Text style={styles.quickActionText}>Manual Split</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersContainer}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('pending', 'Pending')}
          {renderFilterButton('active', 'Active')}
          {renderFilterButton('completed', 'Completed')}
        </View>

        {/* Splits List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading splits...</Text>
          </View>
        ) : displaySplits.length === 0 ? (
          <View style={styles.emptyState}>
            <Image 
              source={{ 
                uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgroup-enpty-state.png?alt=media&token=c3f4dae7-1628-4d8a-9836-e413e3824ebd' 
              }} 
              style={styles.emptyStateIcon} 
            />
            <Text style={styles.emptyStateTitle}>No splits found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {activeFilter === 'all'
                ? "Create your first bill split to start sharing expenses"
                : activeFilter === 'pending'
                  ? "No pending splits"
                  : activeFilter === 'active'
                    ? "No active splits"
                    : "No completed splits"}
            </Text>
            {activeFilter === 'all' && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={handleCreateSplit}
              >
                <Text style={styles.createFirstButtonText}>Create Your First Split</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.splitsContainer}>
            <Text style={styles.sectionTitle}>
              {activeFilter === 'all' ? 'All Splits' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Splits`}
            </Text>
            {displaySplits.map(renderSplitCard)}
          </View>
        )}
      </ScrollView>

      <NavBar currentRoute="SplitsList" navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  createButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  createButtonIconText: {
    fontSize: 24,
  },
  createButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  splitsContainer: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.md,
  },
  splitCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  splitTitleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  splitTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  splitDate: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  splitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  amountContainer: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  participantsContainer: {
    alignItems: 'center',
  },
  participantsLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  participantsValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  splitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createdBy: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  createdAt: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  createFirstButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  walletInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  walletLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  walletAddress: {
    color: colors.green,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  participantAvatarsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  participantAvatarsLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  participantAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.black,
  },
  participantAvatarOverlap: {
    marginLeft: -8,
  },
  participantAvatarOverlay: {
    backgroundColor: colors.green,
    borderColor: colors.black,
  },
  participantAvatarOverlayText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
});

export default SplitsListScreen;
