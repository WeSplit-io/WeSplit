import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useWallet } from '../context/WalletContext';
import { useApp } from '../context/AppContext';
import AuthGuard from '../components/AuthGuard';
import NavBar from '../components/NavBar';
import PoolCard from '../components/PoolCard';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen: React.FC<any> = ({ navigation }) => {
  const { state, getGroupBalances } = useApp();
  const { currentUser, groups } = state;

  // Calculate total balance across all groups
  const totalBalance = groups.reduce((total, group) => {
    const balances = getGroupBalances(group.id);
    const userBalance = balances.find(b => b.userId === currentUser?.id);
    return total + (userBalance?.amount || 0);
  }, 0);

  // Calculate dashboard statistics
  const totalGroups = groups.length;
  const totalExpenses = groups.reduce((sum, group) => 
    sum + group.expenses.reduce((groupSum, expense) => groupSum + expense.amount, 0), 0
  );

  const handleGroupPress = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      navigation.navigate('GroupDetails', { groupId });
    }
  };

  const handleGroupMenuPress = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      Alert.alert(
        group.name,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Details', onPress: () => navigation.navigate('GroupDetails', { groupId }) },
          { text: 'View Members', onPress: () => navigation.navigate('AddMembers', { groupId }) },
          { text: 'View Balance', onPress: () => navigation.navigate('Balance', { groupId }) },
          { text: 'Add Expense', onPress: () => navigation.navigate('AddExpense') },
        ]
      );
    }
  };

  const handleMemberPress = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      navigation.navigate('AddMembers', { groupId });
    }
  };

  const handleAddGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const handleAddExpense = () => {
    if (groups.length === 0) {
      Alert.alert(
        'No Groups Available', 
        'You need to create a group first before adding expenses. Would you like to create a group now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Group', onPress: () => navigation.navigate('CreateGroup') }
        ]
      );
      return;
    }
    navigation.navigate('AddExpense');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleNotificationsPress = () => {
    Alert.alert('Notifications', 'No new notifications');
  };

  const handleQuickActions = (action: string) => {
    switch (action) {
      case 'createGroup':
        handleAddGroup();
        break;
      case 'addExpense':
        handleAddExpense();
        break;
      case 'viewBalances':
        if (groups.length > 0) {
          // Navigate to the first group's balance, or show a picker
          navigation.navigate('Balance', { groupId: groups[0].id });
        } else {
          Alert.alert('No Groups', 'Create a group first to view balances');
        }
        break;
      case 'settleUp':
        if (groups.length > 0) {
          navigation.navigate('SettleUpModal', { groupId: groups[0].id });
        } else {
          Alert.alert('No Groups', 'Create a group first to settle up');
        }
        break;
    }
  };

  const handleNavBarNavigate = (screen: string) => {
    navigation.navigate(screen);
  };

  // Transform groups data for PoolCard component
  const transformedGroups = groups.map(group => {
    const balances = getGroupBalances(group.id);
    const userBalance = balances.find(b => b.userId === currentUser?.id);
    const totalExpenses = group.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      icon: group.category === 'travel' ? 'map-pin' : 'users',
      iconColor: group.category === 'travel' ? '#A5A6F6' : '#FF6B6B',
      groupName: group.name,
      date: new Date(group.updatedAt).toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      }).toUpperCase(),
      totalCost: `${group.currency} ${totalExpenses.toFixed(2)}`,
      youOwe: `${group.currency} ${Math.abs(userBalance?.amount || 0).toFixed(2)}`,
      youOwePositive: (userBalance?.amount || 0) >= 0,
      avatars: group.members.slice(0, 4).map(member => member.avatar),
      moreCount: Math.max(0, group.members.length - 4),
      groupId: group.id,
    };
  });

  return (
    <AuthGuard navigation={navigation}>
      <View style={styles.container}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.userName}>{currentUser?.name || 'User'}!</Text>
        </View>

        {/* Groups Header */}
        <View style={styles.groupsHeader}>
          <Text style={styles.groupsLabel}>Groups</Text>
          <TouchableOpacity onPress={handleAddGroup}>
            <Text style={styles.addGroupText}>+ Add Group</Text>
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        <ScrollView style={styles.groupsList} showsVerticalScrollIndicator={false}>
          {transformedGroups.map((group, idx) => (
            <PoolCard
              key={group.groupId}
              {...group}
              onPress={() => handleGroupPress(group.groupId)}
              onMenuPress={() => handleGroupMenuPress(group.groupId)}
            />
          ))}
        </ScrollView>
      </View>
      <NavBar onNavigate={handleNavBarNavigate} />
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    backgroundColor: '#fff',
  },
  welcomeSection: {
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 18,
    color: '#222',
    fontWeight: '400',
    marginBottom: 2,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  groupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupsLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#222',
  },
  addGroupText: {
    fontSize: 16,
    color: '#A6E22E',
    fontWeight: '500',
  },
  groupsList: {
    flex: 1,
  },
});

export default DashboardScreen;