import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { useGroupList } from '../../hooks/useGroupData';
import { getTotalSpendingInUSDC } from '../../services/priceService';
import { GroupWithDetails } from '../../types';
import { styles } from './styles';
import { colors } from '../../theme';

type FilterType = 'all' | 'active' | 'closed';

const GroupsListScreen: React.FC<any> = ({ navigation }) => {
  const { state, getGroupBalances } = useApp();
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

  // Get user balances using centralized method for proper multi-currency support
  const groupUserBalances = useMemo(() => {
    const balances: Record<string | number, { amount: number; currency: string }> = {};
    groups.forEach(group => {
      const groupBalances = getGroupBalances(group.id);
      const userBalance = groupBalances.find(balance => balance.userId === currentUser?.id);
      balances[group.id] = {
        amount: userBalance?.amount || 0,
        currency: userBalance?.currency || 'SOL'
      };
    });
    return balances;
  }, [groups, currentUser?.id, getGroupBalances]);

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
    await refresh();
  }, [refresh]);

  const getFilteredGroups = useCallback(() => {
    let filteredGroups = groups;

    // Apply filter
    if (activeFilter !== 'all') {
      filteredGroups = groups.filter(group => {
        const userBalance = groupUserBalances[group.id]?.amount || 0;
        if (activeFilter === 'active') return userBalance !== 0;
        if (activeFilter === 'closed') return userBalance === 0;
        return true;
      });
    }

    // Sort by highest value first
    return filteredGroups.sort((a, b) => {
      const aUSD = groupAmountsInUSD[a.id] || 0;
      const bUSD = groupAmountsInUSD[b.id] || 0;
      return bUSD - aUSD;
    });
  }, [groups, groupUserBalances, activeFilter, groupAmountsInUSD]);

  // Get prominent groups (only groups where user is owner)
  const getProminentGroups = useCallback(() => {
    return groups
      .filter(group => group.created_by === currentUser?.id)
      .sort((a, b) => {
        const aUSD = groupAmountsInUSD[a.id] || 0;
        const bUSD = groupAmountsInUSD[b.id] || 0;
        return bUSD - aUSD;
      });
  }, [groups, currentUser?.id, groupAmountsInUSD]);

  const renderFilterButton = (filter: FilterType, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
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
    const usdAmount = groupAmountsInUSD[group.id] || 0;
    const userBalanceData = groupUserBalances[group.id] || { amount: 0, currency: 'SOL' };
    const userBalance = userBalanceData.amount;
    const members = group.members || [];
    const isOwner = group.created_by === currentUser?.id;

    // Determine if group is active based on multiple factors
    const hasExpenses = group.expenses_by_currency && group.expenses_by_currency.length > 0;
    const hasMembers = members.length > 0;
    const hasOpenBalance = userBalance !== 0;
    const isActive = hasExpenses || hasMembers || hasOpenBalance;

    return (
      <TouchableOpacity
        key={group.id}
        style={styles.groupCard}
        onPress={() => (navigation as any).navigate('GroupDetails', { groupId: group.id })}
      >
        {/* Left Section */}
        <View style={styles.groupCardLeft}>
          <View style={styles.groupCardLeftTop}>
            {/* Group Icon */}
            <View style={styles.groupIconContainer}>
              <Icon
                name={group.icon || "briefcase"}
                size={20}
                color={colors.black}
              />
            </View>

            {/* Group Info */}
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>

              {/* Member Status */}
              <View style={styles.groupMemberStatus}>
                <Image source={isOwner ? require('../../../assets/award-icon-white70.png') : require('../../../assets/user-icon-white70.png')} style={styles.prominentGroupRoleIcon} />
                <Text style={styles.groupMemberStatusText}>
                  {isOwner ? 'Owner' : 'Member'}
                </Text>
              </View>


            </View>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredGroups = getFilteredGroups();
  const prominentGroups = getProminentGroups().slice(0, 2);
  const regularGroups = filteredGroups.slice(2);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => (navigation as any).navigate('CreateGroup')}
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
                onPress={() => (navigation as any).navigate('GroupDetails', { groupId: group.id })}
              >
                {/* Background */}
                <View style={styles.prominentGroupCardGradient} />
                <View style={styles.prominentGroupCardGradientOverlay} />

                {/* Header */}
                <View style={styles.prominentGroupHeader}>
                  <View style={styles.prominentGroupIcon}>
                    <Icon
                      name={group.icon || "briefcase"}
                      style={styles.prominentGroupIconSvg}
                    />
                  </View>
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
            <Text style={styles.emptyStateIcon}>👥</Text>
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
                onPress={() => (navigation as any).navigate('CreateGroup')}
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