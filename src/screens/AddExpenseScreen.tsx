import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { createExpense } from '../services/expenseService';
import { getUserGroups, Group } from '../services/groupService';
import { SOLANA_CRYPTOCURRENCIES, Cryptocurrency } from '../utils/cryptoUtils';

interface GroupMember {
  id: number;
  name: string;
  email: string;
}

const AddExpenseScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const groupId = route.params?.groupId;
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Cryptocurrency>(SOLANA_CRYPTOCURRENCIES[0]); // Default to USDC
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [customSelectedMembers, setCustomSelectedMembers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Load the specific group and its members on component mount
  useEffect(() => {
    const loadGroupAndMembers = async () => {
      if (!currentUser?.id || !groupId) return;
      
      try {
        setGroupsLoading(true);
        const userGroups = await getUserGroups(currentUser.id);
        const group = userGroups.find(g => g.id === Number(groupId));
        if (group) {
          setSelectedGroup(group);
          
          // Fetch group members
          const membersResponse = await fetch(`http://192.168.1.75:4000/api/groups/${groupId}/members`);
          if (membersResponse.ok) {
            const members = await membersResponse.json();
            setGroupMembers(members);
            // For equal split: initially select all members
            setSelectedMembers(members.map((m: GroupMember) => m.id));
            // For custom split: initially select no members (user chooses)
            setCustomSelectedMembers([]);
          }
        } else {
          Alert.alert('Error', 'Group not found');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error loading group:', error);
        Alert.alert('Error', 'Failed to load group');
        navigation.goBack();
      } finally {
        setGroupsLoading(false);
      }
    };

    loadGroupAndMembers();
  }, [currentUser?.id, groupId]);

  const handleMemberToggle = (memberId: number) => {
    if (splitType === 'custom') {
      setCustomSelectedMembers(prev => 
        prev.includes(memberId) 
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      );
    }
  };

  const getSelectedMembersForSplit = () => {
    return splitType === 'equal' ? selectedMembers : customSelectedMembers;
  };

  const getAmountPerPerson = () => {
    const totalAmount = parseFloat(amount) || 0;
    const membersInSplit = getSelectedMembersForSplit();
    return membersInSplit.length > 0 ? totalAmount / membersInSplit.length : 0;
  };

  const validateSplit = () => {
    const membersInSplit = getSelectedMembersForSplit();
    return membersInSplit.length > 0;
  };

  const handleSaveExpense = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedGroup) {
      Alert.alert('Error', 'Group not found');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (!validateSplit()) {
      Alert.alert('Error', 'Please select at least one member to split with');
      return;
    }

    setLoading(true);

    try {
      const membersInSplit = getSelectedMembersForSplit();
      
      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        paidBy: currentUser.id.toString(),
        groupId: selectedGroup.id.toString(),
        category: 'general',
        splitType: splitType,
        splitData: { 
          memberIds: membersInSplit,
          amountPerPerson: getAmountPerPerson()
        }
      };

      await createExpense(expenseData);
    
      Alert.alert(
        'Expense Added!',
        `Your expense has been split equally among ${membersInSplit.length} member(s).`,
        [
          {
            text: 'Add Another',
            onPress: () => {
              setDescription('');
              setAmount('');
              setSplitType('equal');
              setSelectedMembers(groupMembers.map(m => m.id));
              setCustomSelectedMembers([]);
            },
          },
          {
            text: 'View Group',
            onPress: () => navigation.navigate('GroupDetails', { groupId: selectedGroup.id }),
          },
          {
            text: 'Back to Dashboard',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating expense:', error);
      Alert.alert('Error', 'Failed to create expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading group...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="alert-circle" size={64} color="#A89B9B" />
          <Text style={styles.emptyStateText}>Group not found</Text>
          <Text style={styles.emptyStateSubtext}>The group you're trying to add an expense to doesn't exist</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton} 
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.emptyStateButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Group Info */}
        <View style={styles.groupInfoCard}>
          <View style={styles.groupIconWrap}>
            <Icon name="users" color="#A5EA15" size={24} />
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{selectedGroup.name}</Text>
            <Text style={styles.groupMembers}>{selectedGroup.member_count} members</Text>
          </View>
      </View>

        {/* Description Input */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="What was this expense for?"
          placeholderTextColor="#A89B9B"
        />

        {/* Currency Selection */}
        <Text style={styles.label}>Currency</Text>
        <TouchableOpacity 
          style={styles.currencySelector}
          onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
        >
          <View style={styles.currencyDisplay}>
            <Text style={styles.currencyIcon}>{selectedCurrency.icon}</Text>
            <View style={styles.currencyInfo}>
              <Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text>
              <Text style={styles.currencyName}>{selectedCurrency.name}</Text>
            </View>
          </View>
          <Icon name="chevron-down" size={20} color="#A89B9B" />
        </TouchableOpacity>

        {showCurrencyPicker && (
          <View style={styles.currencyPicker}>
            <ScrollView 
              style={styles.currencyPickerScroll}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {SOLANA_CRYPTOCURRENCIES.map((crypto) => (
                <TouchableOpacity
                  key={crypto.symbol}
                  style={[
                    styles.currencyOption,
                    selectedCurrency.symbol === crypto.symbol && styles.currencyOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedCurrency(crypto);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={styles.currencyOptionIcon}>{crypto.icon}</Text>
                  <View style={styles.currencyOptionInfo}>
                    <Text style={[
                      styles.currencyOptionSymbol,
                      selectedCurrency.symbol === crypto.symbol && styles.currencyOptionSymbolSelected
                    ]}>
                      {crypto.symbol}
                    </Text>
                    <Text style={[
                      styles.currencyOptionName,
                      selectedCurrency.symbol === crypto.symbol && styles.currencyOptionNameSelected
                    ]}>
                      {crypto.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Amount Input */}
      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
            style={[styles.input, styles.amountInput]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
            placeholderTextColor="#A89B9B"
          keyboardType="numeric"
        />
          <Text style={styles.currencyLabel}>{selectedCurrency.symbol}</Text>
      </View>

        {/* Split Type */}
        <Text style={styles.label}>How to Split</Text>
      <View style={styles.splitRow}>
        <TouchableOpacity
          style={[
            styles.splitOption,
            splitType === 'equal' && styles.splitOptionSelected
          ]}
          onPress={() => setSplitType('equal')}
        >
          <Icon 
            name="users" 
            size={20} 
              color={splitType === 'equal' ? '#212121' : '#A89B9B'} 
          />
          <Text style={[
            styles.splitOptionText,
            splitType === 'equal' && styles.splitOptionTextSelected
          ]}>
            Equal Split
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.splitOption,
            splitType === 'custom' && styles.splitOptionSelected
          ]}
          onPress={() => setSplitType('custom')}
        >
          <Icon 
            name="settings" 
            size={20} 
              color={splitType === 'custom' ? '#212121' : '#A89B9B'} 
          />
          <Text style={[
            styles.splitOptionText,
            splitType === 'custom' && styles.splitOptionTextSelected
          ]}>
            Custom Split
          </Text>
        </TouchableOpacity>
      </View>

        {/* Member Selection for Equal Split */}
        {splitType === 'equal' && (
          <>
            <Text style={styles.label}>Split Between (All Members)</Text>
            <View style={styles.membersContainer}>
              {groupMembers.map((member) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberOption,
                    styles.memberOptionSelected // Always selected for equal split
                  ]}
                >
                  <View style={styles.memberCheckbox}>
                    <Icon name="check" size={16} color="#212121" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, styles.memberNameSelected]}>
                      {member.name} {member.id === Number(currentUser?.id) && '(You)'}
                    </Text>
                    <Text style={[styles.memberEmail, styles.memberEmailSelected]}>
                      {member.email}
                    </Text>
                  </View>
                  {amount && (
                    <View style={styles.memberShare}>
                      <Text style={styles.memberShareAmount}>
                        {(parseFloat(amount) / selectedMembers.length).toFixed(4)} {selectedCurrency.symbol}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Custom Split Interface */}
        {splitType === 'custom' && (
          <>
            <Text style={styles.label}>Select Members to Split With</Text>
            <View style={styles.membersContainer}>
              {groupMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberOption,
                    customSelectedMembers.includes(member.id) && styles.memberOptionSelected
                  ]}
                  onPress={() => handleMemberToggle(member.id)}
                >
                  <View style={[
                    styles.memberCheckbox,
                    customSelectedMembers.includes(member.id) && styles.memberCheckboxSelected
                  ]}>
                    {customSelectedMembers.includes(member.id) && (
                      <Icon name="check" size={16} color="#212121" />
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[
                      styles.memberName,
                      customSelectedMembers.includes(member.id) && styles.memberNameSelected
                    ]}>
                      {member.name} {member.id === Number(currentUser?.id) && '(You)'}
                    </Text>
                    <Text style={[
                      styles.memberEmail,
                      customSelectedMembers.includes(member.id) && styles.memberEmailSelected
                    ]}>
                      {member.email}
                    </Text>
                  </View>
                  {customSelectedMembers.includes(member.id) && amount && customSelectedMembers.length > 0 && (
                    <View style={styles.memberShare}>
                      <Text style={styles.memberShareAmount}>
                        {(parseFloat(amount) / customSelectedMembers.length).toFixed(4)} {selectedCurrency.symbol}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Custom Split Summary */}
            {customSelectedMembers.length > 0 && amount && (
              <View style={styles.splitSummary}>
                <View style={styles.splitSummaryRow}>
                  <Text style={styles.splitSummaryLabel}>Total Expense:</Text>
                  <Text style={styles.splitSummaryValue}>
                    {parseFloat(amount || '0').toFixed(4)} {selectedCurrency.symbol}
                  </Text>
                </View>
                <View style={styles.splitSummaryRow}>
                  <Text style={styles.splitSummaryLabel}>Selected Members:</Text>
                  <Text style={styles.splitSummaryValue}>
                    {customSelectedMembers.length}
                  </Text>
                </View>
                <View style={styles.splitSummaryRow}>
                  <Text style={styles.splitSummaryLabel}>Amount per Person:</Text>
                  <Text style={styles.splitSummaryValue}>
                    {(parseFloat(amount || '0') / customSelectedMembers.length).toFixed(4)} {selectedCurrency.symbol}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Save Button */}
              <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
          onPress={handleSaveExpense}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#212121" />
          ) : (
        <Text style={styles.saveBtnText}>Save Expense</Text>
          )}
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#212121',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  groupInfoCard: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  groupIconWrap: {
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#A89B9B',
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    color: '#A89B9B',
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: 16,
  },
  currencySelector: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  currencyName: {
    fontSize: 14,
    color: '#A89B9B',
    marginTop: 2,
  },
  currencyPicker: {
    backgroundColor: '#212121',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: 16,
    maxHeight: 200,
  },
  currencyPickerScroll: {
    maxHeight: 180,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  currencyOptionSelected: {
    backgroundColor: '#A5EA15',
  },
  currencyOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  currencyOptionInfo: {
    flex: 1,
  },
  currencyOptionSymbol: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  currencyOptionSymbolSelected: {
    color: '#212121',
  },
  currencyOptionName: {
    fontSize: 14,
    color: '#A89B9B',
    marginTop: 2,
  },
  currencyOptionNameSelected: {
    color: '#212121',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 12,
  },
  currencyLabel: {
    fontSize: 18,
    color: '#A89B9B',
    fontWeight: '500',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  splitOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  splitOptionSelected: {
    backgroundColor: '#A5EA15',
    borderColor: '#A5EA15',
  },
  splitOptionText: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  splitOptionTextSelected: {
    color: '#212121',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#A5EA15',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyStateButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
  },
  membersContainer: {
    marginBottom: 24,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    width: '100%',
  },
  memberOptionSelected: {
    backgroundColor: '#A5EA15',
    borderColor: '#A5EA15',
  },
  memberCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCheckboxSelected: {
    backgroundColor: '#212121',
    borderColor: '#A5EA15',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  memberNameSelected: {
    color: '#212121',
  },
  memberEmail: {
    fontSize: 14,
    color: '#A89B9B',
  },
  memberEmailSelected: {
    color: '#212121',
    opacity: 0.8,
  },
  memberShare: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  memberShareAmount: {
    fontSize: 12,
    color: '#A5EA15',
    fontWeight: 'bold',
  },
  customSplitContainer: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customSplitMember: {
    flex: 1,
  },
  customSplitName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  customSplitEmail: {
    fontSize: 14,
    color: '#A89B9B',
  },
  customSplitInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitSummary: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A5EA15',
    marginTop: 16,
  },
  splitSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitSummaryLabel: {
    fontSize: 14,
    color: '#A89B9B',
    fontWeight: '500',
  },
  splitSummaryValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  splitError: {
    color: '#FF0000',
  },
});

export default AddExpenseScreen; 