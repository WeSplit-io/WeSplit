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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styles';
import { colors } from '../../theme/colors';
import NavBar from '../../components/NavBar';
import UserAvatar from '../../components/UserAvatar';
import { BillSplitSummary } from '../../types/billSplitting';
import { SplitStorageService, Split } from '../../services/splitStorageService';
import { MockupDataService } from '../../data/mockupData';
import { priceManagementService } from '../../services/priceManagementService';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';


interface SplitsListScreenProps {
  navigation: any;
}

// Avatar component with loading state and error handling (from DashboardScreen)
const AvatarComponent = ({ avatar, displayName, style }: { avatar?: string, displayName: string, style: any }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset error state when avatar changes
  useEffect(() => {
    if (avatar && avatar.trim() !== '') {
      setHasError(false);
    }
  }, [avatar]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('⏰ Avatar loading timeout, falling back to initial');
        setIsLoading(false);
        setHasError(true);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Check if avatar is valid
  const hasValidAvatar = avatar && avatar.trim() !== '' && !hasError;

  // Fallback to initial if no valid avatar
  if (!hasValidAvatar) {
    return (
      <View style={[style, { backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 14, fontWeight: 'medium', color: colors.white }}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={[style, { overflow: 'hidden', position: 'relative' }]}>
      {isLoading && (
        <View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.darkBorder,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10
          }
        ]}>
          <ActivityIndicator size="small" color={colors.primaryGreen} />
        </View>
      )}
      <Image
        source={{ uri: avatar }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        onLoadStart={() => {
          console.log('🔄 Avatar loading started:', avatar);
          setIsLoading(true);
        }}
        onLoad={() => {
          console.log('✅ Avatar loaded successfully:', avatar);
          setIsLoading(false);
        }}
        onError={(e) => {
          console.log('❌ Avatar loading error:', e.nativeEvent.error, 'for URL:', avatar);
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </View>
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

      if (userIds.size === 0) return;

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
          console.log('🔍 SplitsListScreen: Screen focused, refreshing splits');
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
      console.log('🔍 SplitsListScreen: No current user, skipping load');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 SplitsListScreen: Loading splits for user:', currentUser.id);

      const result = await SplitStorageService.getUserSplits(String(currentUser.id));

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

        // Set the splits without test data
        setSplits(updatedSplits);

        // Load participant avatars
        loadParticipantAvatars(updatedSplits);
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

      // Debug: Log the split data being passed to navigation
      console.log('🔍 SplitsListScreen: Navigating to SplitDetails with split data:', {
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

      // Navigate to the correct screen based on split type and method
      if (split.status === 'active' && split.splitType) {
        // Split method is locked, navigate directly to the appropriate screen
        if (split.splitType === 'fair') {
          navigation.navigate('FairSplit', {
            splitData: split,
            isEditing: false
          });
        } else if (split.splitType === 'degen') {
          navigation.navigate('DegenLock', {
            splitData: split,
            isEditing: false
          });
        } else {
          // Fallback to SplitDetails for unknown types
          navigation.navigate('SplitDetails', {
            splitId: split.id,
            splitData: split,
            isEditing: false
          });
        }
      } else {
        // Split method not locked yet, go to SplitDetails to configure
        navigation.navigate('SplitDetails', {
          splitId: split.id,
          splitData: split,
          isEditing: false
        });
      }
    } catch (err) {
      console.error('❌ SplitsListScreen: Error navigating to split details:', err);
      Alert.alert('Navigation Error', 'Failed to open split details');
    }
  }, [navigation]);



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
          <View style={styles.splitTitleContainer}>
            <Text style={styles.splitTitle} numberOfLines={1}>
              {splitTitle}
            </Text>
            <Text style={styles.splitDate}>
              {split.date}
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

        </View>

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
        </View>
      
        <View style={styles.splitFooter}>
          <Text style={styles.createdBy}>
            {split.creatorId === currentUser?.id ? 'Created by you' : `Created by ${split.creatorName}`}
          </Text>
          <Text style={styles.createdAt}>
            {(() => {
              // Always use mockup data for consistency
              const { MockupDataService } = require('../../data/mockupData');
              return MockupDataService.getBillDate();
            })()}
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
          <Text style={styles.headerTitle}>Pools</Text>
          <TouchableOpacity
            onPress={handleCreateSplit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newPoolButton}
            >
              <Text style={styles.newPoolButtonIcon}>+</Text>
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
              source={require('../../../assets/pool-empty-icon.png')}
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
          <View style={styles.splitsContainer}>
            {displaySplits.map(renderSplitCard)}
          </View>
        )}
      </ScrollView>

      <NavBar currentRoute="SplitsList" navigation={navigation} />
    </SafeAreaView>
  );
};


export default SplitsListScreen;
