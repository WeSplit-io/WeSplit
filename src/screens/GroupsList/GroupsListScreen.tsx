import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useGroupList } from '../../hooks/useGroupData';
import { getTotalSpendingInUSDC } from '../../services/priceService';
import { GroupWithDetails } from '../../types';
import { styles } from './styles';

interface ExtendedExpense {
  id: number;
  group_id: number;
  description: string;
  amount: number;
  currency: string;
  paid_by: number;
  created_at: string;
  updated_at: string;
  splitData?: string;
}

type FilterType = 'all' | 'open' | 'paid';

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
  const [groupAmountsInUSD, setGroupAmountsInUSD] = useState<Record<number, number>>({});

  // Get user balances using centralized method for proper multi-currency support
  const groupUserBalances = useMemo(() => {
    const balances: Record<number, { amount: number; currency: string }> = {};
    groups.forEach(group => {
      const groupBalances = getGroupBalances(group.id);
      const userBalance = groupBalances.find(balance => balance.userId === currentUser?.id);
      balances[group.id] = {
        amount: userBalance?.amount || 0,
        currency: userBalance?.currency || 'SOL'
      };
    });
    return balances;
  }, [groups, getGroupBalances, currentUser?.id]);

  // Convert group amounts to USD for display
  const convertGroupAmountsToUSD = useCallback(async (groups: GroupWithDetails[]) => {
    try {
      const usdAmounts: Record<number, number> = {};
      
      for (const group of groups) {
        if (group.expenses && group.expenses.length > 0) {
          try {
            // Use the total amount already calculated in GroupWithDetails
            const totalUSD = await getTotalSpendingInUSDC(
              group.expenses.map(expense => ({
                amount: expense.amount,
                currency: expense.currency
              }))
            );
            usdAmounts[group.id] = totalUSD;
          } catch (error) {
            console.error(`Error converting group ${group.id} amounts:`, error);
            // Use fallback conversion if price service fails
            const fallbackTotal = group.expenses.reduce((sum, expense) => {
              const rate = expense.currency === 'SOL' ? 200 : (expense.currency === 'USDC' ? 1 : 100);
              return sum + (expense.amount * rate);
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
  useFocusEffect(
    useCallback(() => {
      if (groups.length > 0) {
        convertGroupAmountsToUSD(groups);
      }
    }, [groups, convertGroupAmountsToUSD])
  );

  const onRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const getFilteredGroups = useCallback(() => {
    if (activeFilter === 'all') return groups;
    
    return groups.filter(group => {
      const userBalance = groupUserBalances[group.id]?.amount || 0;
      if (activeFilter === 'open') return userBalance !== 0;
      if (activeFilter === 'paid') return userBalance === 0;
      return true;
    });
  }, [groups, groupUserBalances, activeFilter]);

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
    const userCurrency = userBalanceData.currency;
    const members = group.members || [];
    const hasOpenBalance = userBalance !== 0;
    
    const getStatusColor = () => {
      return hasOpenBalance ? '#FF4D4F' : '#4CAF50';
    };
    
    const getStatusText = () => {
      return hasOpenBalance ? 'Open' : 'Paid';
    };

    const getBalanceText = () => {
      if (userBalance < 0) {
        return `${userCurrency} ${Math.abs(userBalance).toFixed(2)}`;
      }
      return 'All settled';
    };

    return (
      <TouchableOpacity
        key={group.id}
        style={styles.groupCard}
        onPress={() => (navigation as any).navigate('GroupDetails', { groupId: group.id })}
      >
        {/* Header with icon, name, date, and status */}
        <View style={styles.groupHeader}>
          <View style={styles.groupIconContainer}>
            <Icon
              name="people"
              style={styles.groupIcon}
            />
          </View>
          <View style={styles.groupHeaderInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupDate}>
              {new Date(group.created_at).toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Spending info */}
        <View style={styles.spendingSection}>
          <View style={styles.spendingRow}>
            <Text style={styles.spendingLabel}>Total spending:</Text>
            <Text style={styles.spendingAmount}>${usdAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>
              {hasOpenBalance ? 'Total you owe:' : 'All settled'}
            </Text>
            {hasOpenBalance && (
              <Text style={styles.balanceAmount}>
                {getBalanceText()}
              </Text>
            )}
          </View>
        </View>

        {/* Member avatars and settle button */}
        <View style={styles.groupFooter}>
          <View style={styles.memberAvatars}>
            {Array.from({ length: Math.min(members.length, 4) }).map((_, index) => (
              <View key={index} style={styles.memberAvatar} />
            ))}
            {members.length > 4 && (
              <View style={styles.memberAvatarMore}>
                <Text style={styles.memberAvatarMoreText}>+{members.length - 4}</Text>
              </View>
            )}
          </View>
          
          {hasOpenBalance && (
            <TouchableOpacity 
              style={styles.settleButton}
              onPress={() => (navigation as any).navigate('SettleUp', { groupId: group.id })}
            >
              <Text style={styles.settleButtonText}>Settleup</Text>
            </TouchableOpacity>
          )}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => (navigation as any).navigate('CreateGroup')}
        >
          <Text style={styles.addButtonText}>+ Add group</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('open', 'Open')}
          {renderFilterButton('paid', 'Paid')}
        </View>
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
        {getFilteredGroups().length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>👥</Text>
            <Text style={styles.emptyStateTitle}>No groups found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {activeFilter === 'all' 
                ? "Create your first group to start splitting expenses"
                : activeFilter === 'open'
                ? "No groups with open balances"
                : "No groups are settled up"}
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
          getFilteredGroups().map(renderGroupCard)
        )}
      </ScrollView>
      {/* NavBar is now handled by useGroupList or removed if not needed */}
    </SafeAreaView>
  );
};

export default GroupsListScreen; 