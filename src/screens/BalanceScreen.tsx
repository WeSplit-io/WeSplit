import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '../lib/theme';
import BalanceRow from '../components/BalanceRow';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const BalanceScreen: React.FC<any> = ({ navigation, route }) => {
  const { state, getGroupById, getGroupBalances } = useApp();
  const { currentUser } = state;
  const groupId = route.params?.groupId;

  const group = getGroupById(groupId);
  
  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Balances</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="alert-circle" size={64} color={colors.gray} />
          <Text style={styles.emptyStateText}>Group not found</Text>
          <Text style={styles.emptyStateSubtext}>The group you're looking for doesn't exist</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton} 
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.emptyStateButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const balances = getGroupBalances(group.id);

  const handleSettleUp = () => {
    navigation.navigate('SettleUpModal', { groupId: group.id });
  };

  const handleBackToGroup = () => {
    navigation.navigate('GroupDetails', { groupId: group.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Balances</Text>
        <TouchableOpacity onPress={handleSettleUp} style={styles.settleButton}>
          <Icon name="check-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
        </View>

        <Text style={styles.title}>Member Balances</Text>
        
        {balances.length > 0 ? (
          balances.map((balance, idx) => (
            <BalanceRow 
              key={balance.userId + idx} 
              avatar={balance.userAvatar}
              name={balance.userName}
              amount={balance.status === 'settled' ? `${group.currency} 0.00` : `${group.currency} ${balance.amount.toFixed(2)}`}
              status={balance.status === 'settled' ? 'gets back' : balance.status}
              positive={balance.status === 'gets back' || balance.status === 'settled'}
            />
          ))
        ) : (
          <View style={styles.emptyBalances}>
            <Icon name="dollar-sign" size={48} color={colors.gray} />
            <Text style={styles.emptyBalancesText}>No balances yet</Text>
            <Text style={styles.emptyBalancesSubtext}>Add expenses to see balances</Text>
          </View>
        )}

        <TouchableOpacity style={styles.backToGroupButton} onPress={handleBackToGroup}>
          <Icon name="arrow-left" size={20} color={colors.background} />
          <Text style={styles.backToGroupButtonText}>Back to Group</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backToDashboardButton} 
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="home" size={20} color={colors.background} />
          <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  settleButton: {
    padding: spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  groupInfo: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  groupName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  groupDescription: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold as any,
    marginBottom: spacing.lg,
    color: colors.text,
  },
  emptyBalances: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyBalancesText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyBalancesSubtext: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
  },
  backToGroupButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backToGroupButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: colors.background,
    marginLeft: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
  },
  backToDashboardButton: {
    backgroundColor: colors.gray,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backToDashboardButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: colors.background,
    marginLeft: spacing.sm,
  },
});

export default BalanceScreen; 