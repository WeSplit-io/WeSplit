import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import BalanceRow from '../../components/BalanceRow';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme';
import { styles } from './styles';

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
              avatar={balance.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(balance.userName)}&background=random`}
              name={balance.userName}
              amount={balance.status === 'settled' ? `${balance.currency || 'SOL'} 0.00` : `${balance.currency || 'SOL'} ${balance.amount.toFixed(2)}`}
              status={balance.status === 'settled' ? 'gets back' : (balance.status === 'gets_back' ? 'gets back' : 'owes')}
              positive={balance.status === 'gets_back' || balance.status === 'settled'}
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

export default BalanceScreen; 