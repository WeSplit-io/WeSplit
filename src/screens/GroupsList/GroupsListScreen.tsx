import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../components/Icon';
import GroupIcon from '../../components/GroupIcon';
import NavBar from '../../components/NavBar';

import { useApp } from '../../context/AppContext';
import { useGroupList } from '../../hooks/useGroupData';
import { getTotalSpendingInUSDC } from '../../services/priceService';
import { firebaseDataService } from '../../services/firebaseDataService';
import { GroupWithDetails, Expense } from '../../types';
import { styles } from './styles';
import { colors } from '../../theme';

type FilterType = 'all' | 'active' | 'closed';

const GroupsListScreen: React.FC<any> = ({ navigation }) => {
  const { state, getGroupBalances, loadUserGroups } = useApp();
  const { currentUser } = state;

  const {
    groups,
    loading,
    refreshing,
    refresh,
    totalGroups,
    hasGroups
  } = useGroupList();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [groupAmountsInUSD, setGroupAmountsInUSD] = useState<Record<string | number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [groupUserBalances, setGroupUserBalances] = useState<Record<string | number, { amount: number; currency: string }>>({});
  const [scrollY] = useState(new Animated.Value(0));
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  // Track scroll position to show/hide sticky header
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      // Show sticky header when scrolling down past the prominent groups section
      const shouldShowSticky = value > 150; // Reduced threshold for earlier appearance
      setShowStickyHeader(shouldShowSticky);
    });

    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  // Component mounted effect
  useEffect(() => {
    // Component initialization complete
  }, [currentUser?.id, groups.length, loading]);

  // Load user groups when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadGroups = async () => {
        try {
          setError(null);
          if (currentUser?.id) {
            await loadUserGroups(true); // Force refresh when screen is focused
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load groups';
          console.error('❌ GroupsListScreen: Error loading groups:', errorMessage);
          setError(errorMessage);
        }
      };

      loadGroups();
    }, [currentUser?.id, loadUserGroups])
  );

  // Groups state effect
  useEffect(() => {
    // Groups state updated
  }, [groups, currentUser?.id, loading, hasGroups]);

  // Manual trigger to load groups if they're not loaded
  useEffect(() => {
    if (currentUser?.id && groups.length === 0 && !loading) {
      loadUserGroups(true);
    }
  }, [currentUser?.id, groups.length, loading, loadUserGroups]);

  // Refresh groups when user changes
  useEffect(() => {
    if (currentUser?.id) {
      loadUserGroups(true);
    }
  }, [currentUser?.id, loadUserGroups]);

  // Load balances for groups
  useEffect(() => {
    const loadBalances = async () => {
      if (groups.length === 0) return;
      
      try {
        const newBalances: { [groupId: string]: { amount: number; currency: string } } = {};
        
        for (const group of groups) {
          try {
            // Use the group's total amount (sum of all expenses)
            const groupTotalAmount = group.totalAmount || 0;
            newBalances[group.id] = {
              amount: groupTotalAmount,
              currency: group.currency || 'USDC'
            };
          } catch (error) {
            // keep for prod debug
            console.error('🔄 GroupsListScreen: Error loading total for group', group.name, ':', error);
          }
        }
        
        setGroupUserBalances(newBalances);
      } catch (error) {
        // keep for prod debug
        console.error('🔄 GroupsListScreen: Error loading group totals:', error);
      }
    };
    
    loadBalances();
  }, [groups]);

  // Convert group amounts to USD for display using available summary data
  const convertGroupAmountsToUSD = useCallback(async (groups: GroupWithDetails[]) => {
    try {
      const usdAmounts: Record<string | number, number> = {};

      for (const group of groups) {
        let totalUSD = 0;

        // First try to use expenses_by_currency data
        if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
          try {
            totalUSD = await getTotalSpendingInUSDC(
              group.expenses_by_currency.map(expense => ({
                amount: expense.total_amount || 0,
                currency: expense.currency || 'SOL'
              }))
            );
          } catch (error) {
            // Use fallback conversion if price service fails
            totalUSD = group.expenses_by_currency.reduce((sum, expense) => {
              const rate = (expense.currency === 'SOL' ? 200 : (expense.currency === 'USDC' ? 1 : 100));
              return sum + ((expense.total_amount || 0) * rate);
            }, 0);
          }
        } 
        // If no expenses_by_currency data, load individual expenses and calculate
        else {
          try {
            // Load individual expenses for this group
            const individualExpenses = await firebaseDataService.expense.getGroupExpenses(group.id.toString());
            
            if (individualExpenses && individualExpenses.length > 0) {
              // Calculate totals by currency from individual expenses
              const currencyTotals = individualExpenses.reduce((acc: Record<string, number>, expense: Expense) => {
                if (!expense || expense.amount === undefined) return acc;
                const currency = expense.currency || 'SOL';
                acc[currency] = (acc[currency] || 0) + (expense.amount || 0);
                return acc;
              }, {} as Record<string, number>);

              // Convert to USD using simple rates
              totalUSD = Object.entries(currencyTotals).reduce((sum: number, [currency, amount]) => {
                const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
                return sum + ((amount as number) * rate);
              }, 0);
            }
          } catch (error) {
            console.error('Error loading individual expenses for group', group.id, ':', error);
          }
        }
        // If no expenses data at all, use group.totalAmount as fallback
        if (totalUSD === 0 && group.totalAmount && group.totalAmount > 0) {
          // Assume the totalAmount is in the group's currency and convert
          const currency = group.currency || 'SOL';
          const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
          totalUSD = group.totalAmount * rate;
        }

        usdAmounts[group.id] = totalUSD;

        // USD conversion completed for group
      }

      setGroupAmountsInUSD(usdAmounts);
    } catch (error) {
      console.error('Error converting group amounts to USD:', error);
    }
  }, []);

  // Convert amounts when groups change
  useEffect(() => {
    if (groups.length > 0) {
      convertGroupAmountsToUSD(groups);
    }
  }, [groups, convertGroupAmountsToUSD]);



  const onRefresh = useCallback(async () => {
    try {
      setError(null);
    await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh groups';
      console.error('❌ GroupsListScreen: Error refreshing groups:', errorMessage);
      setError(errorMessage);
    }
  }, [refresh]);

  const getFilteredGroups = useCallback(() => {
    let filteredGroups = groups;

    // Apply filter
    if (activeFilter !== 'all') {
      filteredGroups = groups.filter(group => {
        const groupTotalAmountUSD = groupAmountsInUSD[group.id] || 0;
        const isActive = groupTotalAmountUSD > 0; // Group is active if it has expenses
        
        if (activeFilter === 'active') return isActive;
        if (activeFilter === 'closed') return !isActive;
        return true;
      });
    }

    // Sort groups by status and then by name
    filteredGroups.sort((a, b) => {
      const totalAmountA = groupAmountsInUSD[a.id] || 0;
      const totalAmountB = groupAmountsInUSD[b.id] || 0;
      
      // First sort by active status (active groups first)
      const isActiveA = totalAmountA > 0;
      const isActiveB = totalAmountB > 0;
      
      if (isActiveA !== isActiveB) {
        return isActiveA ? -1 : 1; // Active groups first
      }
      
      // Then sort by total amount (highest first)
      if (totalAmountA !== totalAmountB) {
        return totalAmountB - totalAmountA; // Highest amount first
      }
      
      // Finally sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

    // Filtering completed

    return filteredGroups;
  }, [groups, activeFilter]);

  const getProminentGroups = useCallback(() => {
    // Show all groups where user is the creator (owner)
    return groups.filter(group => group.created_by === currentUser?.id);
  }, [groups, currentUser?.id]);

  const getAllGroups = useCallback(() => {
    // Return all groups the user is a part of (both owner and participant)
    return groups;
  }, [groups]);

  const handleGroupPress = useCallback((group: GroupWithDetails) => {
    try {
      navigation.navigate('GroupDetails', { groupId: group.id });
    } catch (err) {
      console.error('❌ GroupsListScreen: Error navigating to group details:', err);
      Alert.alert('Navigation Error', 'Failed to open group details');
    }
  }, [navigation]);

  const handleCreateGroup = useCallback(() => {
    try {
      navigation.navigate('CreateGroup');
    } catch (err) {
      console.error('❌ GroupsListScreen: Error navigating to create group:', err);
      Alert.alert('Navigation Error', 'Failed to open create group screen');
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

  const renderGroupCard = (group: GroupWithDetails) => {
    // Use the USD-converted amount for consistent display
    const groupTotalAmountUSD = groupAmountsInUSD[group.id] || 0;
    const isActive = groupTotalAmountUSD > 0; // Group is active if it has expenses
    const members = group.members || [];
    const isOwner = group.created_by === currentUser?.id;

    // Rendering group card

    return (
      <TouchableOpacity
        key={group.id}
        style={styles.groupCard}
        onPress={() => handleGroupPress(group)}
      >
        {/* Left Section */}
        <View style={styles.groupCardLeft}>
            {/* Group Icon */}
            <GroupIcon
              category={group.category || 'trip'}
              color={group.color || '#A5EA15'}
            size={48}
            />

            {/* Group Info */}
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <View style={styles.groupInfoRow}>
                <Text style={styles.groupMemberCount}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
                {/* Owner Label */}
                {isOwner && (
                  <View style={styles.ownerLabel}>
                    <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Faward-icon-black.png?alt=media&token=07283493-afd6-489e-a5c2-7dffc6922f41' }} style={styles.ownerLabelIcon} />
                    <Text style={styles.ownerLabelText}>Owner</Text>
                  </View>
                )}
              </View>
              {/* Display USD-converted group total amount if available */}
              {groupTotalAmountUSD > 0 && (
                <Text style={styles.groupBalance}>
                  ${groupTotalAmountUSD.toFixed(2)}
                </Text>
              )}
          </View>

          {/* Member Avatars */}
          <View style={styles.groupMemberAvatars}>
            {members.slice(0, 3).map((member, index) => (
              <View key={member.id} style={styles.groupMemberAvatar}>
                {member.avatar && member.avatar.trim() !== '' ? (
                  <Image
                    source={{ uri: member.avatar }}
                    style={styles.groupMemberAvatarImage}
                  />
                ) : (
                  <Text style={styles.groupMemberAvatarText}>
                    {((member.name || member.email || 'U') as string).charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
            {members.length > 3 && (
              <View style={styles.groupMemberAvatarMore}>
                <Text style={styles.groupMemberAvatarMoreText}>
                  +{members.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right Section */}
        <View style={styles.groupCardRight}>
          {/* Status Indicator */}
          <View style={styles.groupStatusContainer}>
            <View style={[styles.groupStatusDot, isActive ? styles.groupStatusDotActive : styles.groupStatusDotClosed]} />
            <Text style={styles.groupStatusText}>
              {isActive ? 'Active' : 'Closed'}
            </Text>
          </View>

          {/* Navigation Arrow */}
          <Icon name="chevron-right" size={20} color={colors.white} />
        </View>
      </TouchableOpacity>
    );
  };

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        <NavBar currentRoute="GroupsList" navigation={navigation} />
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your groups...</Text>
        </View>
        <NavBar currentRoute="GroupsList" navigation={navigation} />
      </SafeAreaView>
    );
  }

  const allGroups = getAllGroups(); // All groups (owner + participant)
  const filteredGroups = getFilteredGroups();
  const prominentGroups = getProminentGroups(); // Show all owner groups
  const displayGroups = activeFilter === 'all' ? allGroups : filteredGroups; // Apply filtering to all groups

  // USD amounts updated effect
  useEffect(() => {
    // USD amounts have been updated
  }, [groupAmountsInUSD, groups.length, prominentGroups.length]);

  // Debug function to check all group memberships (commented out for production)
  const debugCheckAllMemberships = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      // Debug functionality removed for production
    } catch (error) {
      console.error('❌ GroupsListScreen: Error debugging memberships:', error);
    }
  }, [currentUser?.id]);

  // Call debug function when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      debugCheckAllMemberships();
    }
  }, [currentUser?.id, debugCheckAllMemberships]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Header (appears when scrolling) */}
      {showStickyHeader && prominentGroups.length > 0 && (
        <Animated.View style={styles.stickyHeader}>
          <Text style={styles.stickyHeaderTitle}>Groups You Own</Text>
          <View style={styles.stickyFiltersContainer}>
            {renderFilterButton('all', 'All')}
            {renderFilterButton('active', 'Active')}
            {renderFilterButton('closed', 'Closed')}
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateGroup}
        >
                          <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fplus-icon-green.png?alt=media&token=15ce2f24-4cec-4d4d-8c98-d7fba808604e' }} style={styles.addButtonIcon} />
          <Text style={styles.addButtonText}>New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A5EA15"
            colors={['#A5EA15']}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Sticky Prominent Groups Section */}
        {prominentGroups.length > 0 && (
          <View style={styles.stickyProminentContainer}>
            <Text style={styles.sectionTitle}>Groups You Own</Text>
            <Text style={styles.sectionSubtitle}>These groups also appear in "All Groups" below</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.prominentGroupsGrid}
            >
              {prominentGroups.map((group, index) => {
                const groupTotalAmountUSD = groupAmountsInUSD[group.id] || 0;
                
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.prominentGroupCard,
                      index === 0 ? styles.prominentGroupCardLeft : styles.prominentGroupCardRight
                    ]}
                    onPress={() => handleGroupPress(group)}
                  >
                  {/* Background */}
                  <View style={styles.prominentGroupCardGradient} />
                  <View style={styles.prominentGroupCardGradientOverlay} />

                  {/* Header */}
                  <View style={styles.prominentGroupHeader}>
                    <GroupIcon
                      category={group.category || 'trip'}
                      color={group.color || '#A5EA15'}
                      size={40}
                    />
                    {/* Show USD-converted total */}
                    <View style={styles.prominentGroupAmountContainer}>
                      <Image
                        source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-black.png?alt=media&token=2b33d108-f3aa-471d-b7fe-6166c53c1d56' }}
                        style={styles.prominentUsdcLogo}
                      />
                      <Text style={styles.prominentGroupAmount}>
                        {(groupAmountsInUSD[group.id] || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Group Name */}
                  <Text style={styles.prominentGroupName}>{group.name}</Text>

                  {/* Role Container */}
                  <View style={styles.prominentGroupRoleContainer}>
                    <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Faward-icon-black.png?alt=media&token=07283493-afd6-489e-a5c2-7dffc6922f41' }} style={styles.prominentGroupRoleIcon} />

                    <Text style={styles.prominentGroupRole}>
                      Owner
                    </Text>
                  </View>

                  {/* Member Avatars */}
                  <View style={styles.prominentMemberAvatars}>
                    {(group.members || []).slice(0, 3).map((member, index) => (
                      <View key={member.id} style={styles.prominentMemberAvatar}>
                        {member.avatar && member.avatar.trim() !== '' ? (
                          <Image
                            source={{ uri: member.avatar }}
                            style={styles.prominentMemberAvatarImage}
                          />
                        ) : (
                          <Text style={styles.prominentMemberAvatarText}>
                            {((member.name || member.email || 'U') as string).charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                    ))}
                    {(group.members || []).length > 3 && (
                      <View style={styles.prominentMemberAvatarMore}>
                        <Text style={styles.prominentMemberAvatarMoreText}>
                          +{(group.members || []).length - 3}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Navigation arrow */}
                  <View style={styles.prominentGroupArrow}>
                    <Icon name="chevron-right" size={20} color={colors.black} />
                  </View>
                </TouchableOpacity>
              );
              })}
            </ScrollView>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filtersContainer}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('active', 'Active')}
          {renderFilterButton('closed', 'Closed')}
        </View>

        {/* All Groups Section */}
        <View style={styles.allGroupsContainer}>
          <Text style={styles.sectionTitle}>All Groups</Text>
        </View>

        {/* Groups List */}
        {displayGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgroup-enpty-state.png?alt=media&token=c3f4dae7-1628-4d8a-9836-e413e3824ebd' }} style={styles.emptyStateIcon} />
            <Text style={styles.emptyStateTitle}>No groups found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {activeFilter === 'all'
                ? "Create your first group to start splitting expenses"
                : activeFilter === 'active'
                  ? "No active groups"
                  : "No closed groups"}
            </Text>
            {activeFilter === 'all' && (
              <TouchableOpacity
                style={styles.createGroupButton}
                onPress={handleCreateGroup}
              >
                <Text style={styles.createGroupButtonText}>Create Your First Group</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayGroups.map(renderGroupCard)
        )}
      </ScrollView>

      <NavBar currentRoute="GroupsList" navigation={navigation} />
    </SafeAreaView>
  );
};

export default GroupsListScreen; 