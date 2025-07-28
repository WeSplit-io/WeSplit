import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../components/Icon';
import GroupIcon from '../../components/GroupIcon';
import NavBar from '../../components/NavBar';

import { useApp } from '../../context/AppContext';
import { useGroupList } from '../../hooks/useGroupData';
import { getTotalSpendingInUSDC } from '../../services/priceService';
import { GroupWithDetails } from '../../types';
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

  // Debug logging
  useEffect(() => {
    if (__DEV__) {
      console.log('🔄 GroupsListScreen: Component mounted');
      console.log('🔄 GroupsListScreen: Current user:', currentUser?.id);
      console.log('🔄 GroupsListScreen: Groups count:', groups.length);
      console.log('🔄 GroupsListScreen: Loading state:', loading);
    }
  }, [currentUser?.id, groups.length, loading]);

  // Load user groups when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (__DEV__) {
        console.log('🔄 GroupsListScreen: Screen focused, loading user groups');
      }

      const loadGroups = async () => {
        try {
          setError(null);
          if (currentUser?.id) {
            console.log('🔄 GroupsListScreen: Loading groups for user:', currentUser.id);
            await loadUserGroups(true); // Force refresh when screen is focused
            console.log('🔄 GroupsListScreen: Groups loaded successfully');
          } else {
            console.log('🔄 GroupsListScreen: No current user, cannot load groups');
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

  // Debug logging for groups
  useEffect(() => {
    if (__DEV__) {
      console.log('🔄 GroupsListScreen: Groups state changed:', {
        groupsCount: groups.length,
        groups: groups.map(g => ({ 
          id: g.id, 
          name: g.name, 
          created_by: g.created_by,
          members: g.members?.length || 0,
          invitation_status: g.members?.map(m => m.invitation_status) || []
        })),
        currentUserId: currentUser?.id,
        loading,
        hasGroups
      });
      
      // Additional debug: Check if user is in any groups at all
      if (groups.length === 0 && currentUser?.id) {
        console.log('🔄 GroupsListScreen: No groups found for user. This could mean:');
        console.log('🔄 GroupsListScreen: 1. User is not a member of any groups');
        console.log('🔄 GroupsListScreen: 2. User is only in groups with pending invitation status');
        console.log('🔄 GroupsListScreen: 3. Groups exist but invitation_status is not "accepted"');
        console.log('🔄 GroupsListScreen: 4. Firebase query is failing');
      }
    }
  }, [groups, currentUser?.id, loading, hasGroups]);

  // Manual trigger to load groups if they're not loaded
  useEffect(() => {
    if (currentUser?.id && groups.length === 0 && !loading) {
      console.log('🔄 GroupsListScreen: No groups found, manually triggering load');
      loadUserGroups(true);
    }
  }, [currentUser?.id, groups.length, loading, loadUserGroups]);

  // Refresh groups when user changes
  useEffect(() => {
    if (currentUser?.id) {
      console.log('🔄 GroupsListScreen: User changed, refreshing groups');
      loadUserGroups(true);
    }
  }, [currentUser?.id, loadUserGroups]);

  // Load balances for groups
  useEffect(() => {
    const loadBalances = async () => {
      if (groups.length === 0) return;
      
      if (__DEV__) { console.log('🔄 GroupsListScreen: Loading group totals for', groups.length, 'groups'); }
      
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
            if (__DEV__) { console.log('🔄 GroupsListScreen: Group total for', group.name, ':', groupTotalAmount); }
          } catch (error) {
            if (__DEV__) { console.error('🔄 GroupsListScreen: Error loading total for group', group.name, ':', error); }
          }
        }
        
        setGroupUserBalances(newBalances);
        if (__DEV__) { console.log('🔄 GroupsListScreen: Updated group totals:', newBalances); }
      } catch (error) {
        if (__DEV__) { console.error('🔄 GroupsListScreen: Error loading group totals:', error); }
      }
    };
    
    loadBalances();
  }, [groups]);

  // Convert group amounts to USD for display using available summary data
  const convertGroupAmountsToUSD = useCallback(async (groups: GroupWithDetails[]) => {
    try {
      const usdAmounts: Record<string | number, number> = {};

      for (const group of groups) {
        // Use expenses_by_currency data that's actually available from the backend
        if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
          try {
            const totalUSD = await getTotalSpendingInUSDC(
              group.expenses_by_currency.map(expense => ({
                amount: expense.total_amount || 0,
                currency: expense.currency || 'SOL'
              }))
            );
            usdAmounts[group.id] = totalUSD;
          } catch (error) {
            // Use fallback conversion if price service fails
            const fallbackTotal = group.expenses_by_currency.reduce((sum, expense) => {
              const rate = (expense.currency === 'SOL' ? 200 : (expense.currency === 'USDC' ? 1 : 100));
              return sum + ((expense.total_amount || 0) * rate);
            }, 0);
            usdAmounts[group.id] = fallbackTotal;
          }
        } else {
          usdAmounts[group.id] = 0;
        }
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
        const groupTotalAmount = group.totalAmount || 0;
        const isActive = groupTotalAmount > 0; // Group is active if it has expenses
        
        if (activeFilter === 'active') return isActive;
        if (activeFilter === 'closed') return !isActive;
        return true;
      });
    }

    // Sort groups by status and then by name
    filteredGroups.sort((a, b) => {
      const totalAmountA = a.totalAmount || 0;
      const totalAmountB = b.totalAmount || 0;
      
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

    // Only log when there are actual changes or in development
    if (__DEV__ && (filteredGroups.length !== groups.length || activeFilter !== 'all')) {
      console.log('🔄 GroupsListScreen: Filtered groups:', {
        activeFilter,
        totalGroups: groups.length,
        filteredCount: filteredGroups.length,
        groupTotals: filteredGroups.map(group => ({
          groupId: group.id,
          groupName: group.name,
          totalAmount: group.totalAmount || 0
        }))
      });
    }

    return filteredGroups;
  }, [groups, activeFilter]);

  const getProminentGroups = useCallback(() => {
    // Show groups where user is the creator (owner)
    return groups.filter(group => group.created_by === currentUser?.id);
  }, [groups, currentUser?.id]);

  const handleGroupPress = useCallback((group: GroupWithDetails) => {
    try {
      if (__DEV__) {
        console.log('🔄 GroupsListScreen: Navigating to GroupDetails with groupId:', group.id);
      }
      navigation.navigate('GroupDetails', { groupId: group.id });
    } catch (err) {
      console.error('❌ GroupsListScreen: Error navigating to group details:', err);
      Alert.alert('Navigation Error', 'Failed to open group details');
    }
  }, [navigation]);

  const handleCreateGroup = useCallback(() => {
    try {
      if (__DEV__) {
        console.log('🔄 GroupsListScreen: Navigating to CreateGroup');
      }
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
    // Use the group's total amount (sum of all expenses) instead of user balance
    const groupTotalAmount = group.totalAmount || 0;
    const isActive = groupTotalAmount > 0; // Group is active if it has expenses
    const members = group.members || [];

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
            <Text style={styles.groupMemberCount}>
              {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              {/* Display group total amount if available */}
              {groupTotalAmount > 0 && (
                <Text style={styles.groupBalance}>
                  ${groupTotalAmount.toFixed(2)}
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

  const filteredGroups = getFilteredGroups();
  const prominentGroups = getProminentGroups().slice(0, 2);
  const regularGroups = filteredGroups.slice(2);

  // Temporary debug function to check all group memberships
  const debugCheckAllMemberships = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      console.log('🔍 GroupsListScreen: Debugging all group memberships for user:', currentUser.id);
      
      // Import Firebase functions for debugging
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      
      const groupMembersRef = collection(db, 'groupMembers');
      const memberQuery = query(
        groupMembersRef, 
        where('user_id', '==', currentUser.id.toString())
      );
      const memberDocs = await getDocs(memberQuery);
      
      console.log('🔍 GroupsListScreen: Found', memberDocs.docs.length, 'total member records');
      
      memberDocs.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🔍 GroupsListScreen: Member record ${index + 1}:`, {
          group_id: data.group_id,
          user_id: data.user_id,
          invitation_status: data.invitation_status,
          joined_at: data.joined_at,
          invited_at: data.invited_at,
          invited_by: data.invited_by
        });
      });
      
      // Also check groups where user is creator
      const groupsRef = collection(db, 'groups');
      const creatorQuery = query(groupsRef, where('created_by', '==', currentUser.id.toString()));
      const creatorDocs = await getDocs(creatorQuery);
      
      console.log('🔍 GroupsListScreen: Found', creatorDocs.docs.length, 'groups where user is creator');
      
      creatorDocs.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🔍 GroupsListScreen: Creator group ${index + 1}:`, {
          group_id: doc.id,
          name: data.name,
          created_by: data.created_by,
          created_at: data.created_at
        });
      });
      
      // Check all groups in the database
      const allGroupsQuery = query(groupsRef);
      const allGroupsDocs = await getDocs(allGroupsQuery);
      
      console.log('🔍 GroupsListScreen: Found', allGroupsDocs.docs.length, 'total groups in database');
      
      allGroupsDocs.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🔍 GroupsListScreen: All groups ${index + 1}:`, {
          group_id: doc.id,
          name: data.name,
          created_by: data.created_by,
          created_at: data.created_at
        });
      });
      
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
      {/* Navigation Debug Component */}

      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateGroup}
        >
          <Image source={require('../../../assets/plus-icon-green.png')} style={styles.addButtonIcon} />
          <Text style={styles.addButtonText}>New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Prominent Group Cards - Only show groups where user is owner */}
      {prominentGroups.length > 0 && (
        <View style={styles.prominentGroupsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.prominentGroupsGrid}
          >
            {prominentGroups.map((group, index) => (
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
                      source={require('../../../assets/usdc-logo-black.png')}
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
                  <Image source={require('../../../assets/award-icon-black.png')} style={styles.prominentGroupRoleIcon} />

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
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('active', 'Active')}
        {renderFilterButton('closed', 'Closed')}
      </View>

      {/* Groups List */}
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
      >
        {filteredGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Image source={require('../../../assets/group-enpty-state.png')} style={styles.emptyStateIcon} />
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
          regularGroups.map(renderGroupCard)
        )}
      </ScrollView>

      <NavBar currentRoute="GroupsList" navigation={navigation} />
    </SafeAreaView>
  );
};

export default GroupsListScreen; 