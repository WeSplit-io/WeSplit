import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useGroupList, useExpenseOperations } from '../../hooks/useGroupData';
import { GroupWithDetails, GroupMember } from '../../types';
import { SOLANA_CRYPTOCURRENCIES, Cryptocurrency } from '../../utils/cryptoUtils';
import { styles } from './styles';

// Updated categories with more vibrant colors matching the screenshots
const categories = [
  { name: 'Trip', icon: 'map-pin', color: '#A5EA15' },
  { name: 'Food', icon: 'coffee', color: '#FFB800' },
  { name: 'Home', icon: 'home', color: '#00BFA5' },
  { name: 'Event', icon: 'briefcase', color: '#FF6B35' },
];

const AddExpenseScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  // Use new hooks for data management
  const { groups, loading: groupsLoading } = useGroupList();
  
  const groupId = route.params?.groupId;
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [selectedCurrency, setSelectedCurrency] = useState<Cryptocurrency>(SOLANA_CRYPTOCURRENCIES[0]);
  const [splitType, setSplitType] = useState<'equal' | 'manual'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{[key: number]: string}>({});
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  // Use expense operations hook - Initialize with selected group ID
  const { 
    createExpense: handleCreateExpense, 
    loading: expenseLoading,
    getGroupMembers,
    error: expenseError,
    clearError
  } = useExpenseOperations(selectedGroup?.id || (groupId ? Number(groupId) : (groups[0]?.id || 0)));

  // Set initial group when data loads
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      // Set selected group based on route param or first group
      const initialGroup = groupId 
        ? groups.find(g => g.id === Number(groupId)) 
        : groups[0];
        
      if (initialGroup) {
        setSelectedGroup(initialGroup);
        // Initialize selected members with all group members
        setSelectedMembers(initialGroup.members.map(m => m.id));
      }
    }
  }, [groups, groupId, selectedGroup]);

  // Get group members using the hook instead of API call
  const groupMembers = getGroupMembers();

  // Update selected members when group changes
  useEffect(() => {
    if (selectedGroup && groupMembers.length > 0) {
      setSelectedMembers(groupMembers.map(m => m.id));
        setCustomAmounts({});
    }
  }, [selectedGroup, groupMembers]);

  const handleGroupSelect = (group: GroupWithDetails) => {
    setSelectedGroup(group);
    setShowGroupSelector(false);
    // Members will be automatically available from the hook
  };

  const handleMemberToggle = (memberId: number) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getTotalAmount = () => {
    if (splitType === 'equal') {
      return parseFloat(amount) || 0;
    } else {
      return Object.values(customAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
    }
  };

  const getAmountPerPerson = () => {
    const totalAmount = parseFloat(amount) || 0;
    return selectedMembers.length > 0 ? totalAmount / selectedMembers.length : 0;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const handleSaveExpense = async () => {
    // Clear any previous errors
    clearError();

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter an expense name');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    if (!selectedGroup || !currentUser?.id) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    try {
      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        paidBy: currentUser.id, // Backend API expects camelCase
        groupId: selectedGroup.id, // Backend API expects camelCase
        category: categories[selectedCategory].name.toLowerCase(),
        splitType: splitType,
        splitData: { 
          memberIds: selectedMembers,
          amountPerPerson: getAmountPerPerson(),
          customAmounts: splitType === 'manual' ? customAmounts : undefined
        }
      };

      await handleCreateExpense(expenseData);
      
      // Navigate to success screen
      navigation.navigate('ExpenseSuccess', {
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        description: description.trim(),
        groupName: selectedGroup.name,
        memberCount: selectedMembers.length
      });
      
    } catch (error) {
      console.error('Error creating expense:', error);
      Alert.alert('Error', 'Failed to create expense. Please try again.');
    }
  };

  // Show error from hook if any
  useEffect(() => {
    if (expenseError) {
      Alert.alert('Error', expenseError);
    }
  }, [expenseError]);

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (groups.length === 0) {
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
          <Icon name="users" size={64} color="#A89B9B" />
          <Text style={styles.emptyStateText}>No Groups Found</Text>
          <Text style={styles.emptyStateSubtext}>You need to be part of a group to add expenses</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Icon name="camera" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        {/* Group Selection */}
        <Text style={styles.sectionLabel}>Select Group</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupsScroll}>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupCard,
                selectedGroup?.id === group.id && styles.groupCardSelected
              ]}
              onPress={() => handleGroupSelect(group)}
            >
              <View style={[styles.groupIcon, { backgroundColor: group.color }]}>
                <Icon name={group.icon as any} size={24} color="#FFF" />
              </View>
              <Text style={styles.groupLabel} numberOfLines={1}>
                {group.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Expense Name */}
        <Text style={styles.sectionLabel}>Expense Name</Text>
        <TextInput
          style={styles.textInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Expense Name"
          placeholderTextColor="#A89B9B"
        />

        {/* Date */}
        <Text style={styles.sectionLabel}>Date</Text>
        <TouchableOpacity style={styles.dateInput}>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
          <Icon name="calendar" size={20} color="#A89B9B" />
        </TouchableOpacity>

        {/* Amount */}
        <Text style={styles.sectionLabel}>Amount</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="00.00"
            placeholderTextColor="#A89B9B"
            keyboardType="decimal-pad"
          />
          <TouchableOpacity 
            style={styles.currencyButton}
            onPress={() => setShowCurrencyPicker(true)}
          >
            <Text style={styles.currencyButtonText}>{selectedCurrency.symbol}</Text>
            <Icon name="chevron-down" size={16} color="#A89B9B" />
          </TouchableOpacity>
        </View>

        {amount && (
          <Text style={styles.totalText}>
            Total: {getTotalAmount().toFixed(3)} {selectedCurrency.symbol}
          </Text>
        )}

        {/* Split Amount */}
        <View style={styles.splitHeader}>
          <Text style={styles.sectionLabel}>Split Amount</Text>
          <View style={styles.splitToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, splitType === 'equal' && styles.toggleButtonActive]}
              onPress={() => setSplitType('equal')}
            >
              <Text style={[styles.toggleText, splitType === 'equal' && styles.toggleTextActive]}>
                Equal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, splitType === 'manual' && styles.toggleButtonActive]}
              onPress={() => setSplitType('manual')}
            >
              <Text style={[styles.toggleText, splitType === 'manual' && styles.toggleTextActive]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members List */}
        {groupMembers.map((member) => {
          const isSelected = selectedMembers.includes(member.id);
          const memberAmount = splitType === 'equal' 
            ? getAmountPerPerson() 
            : parseFloat(customAmounts[member.id] || '0');

          return (
            <TouchableOpacity
              key={member.id}
              style={[styles.memberRow, isSelected && styles.memberRowSelected]}
              onPress={() => handleMemberToggle(member.id)}
            >
              <View style={styles.memberCheckbox}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Icon name="check" size={12} color="#212121" />}
                </View>
              </View>
              
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberHandle}>
                  {member.email.split('@')[0]}...{member.email.split('@')[0].slice(-3)}
                </Text>
              </View>
              
              {isSelected && amount && (
                <Text style={styles.memberAmount}>
                  ${memberAmount.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!description.trim() || !amount || selectedMembers.length === 0 || expenseLoading) && styles.saveButtonDisabled
          ]}
          onPress={handleSaveExpense}
          disabled={!description.trim() || !amount || selectedMembers.length === 0 || expenseLoading}
        >
          {expenseLoading ? (
            <ActivityIndicator size="small" color="#212121" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.currencyModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Icon name="x" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {SOLANA_CRYPTOCURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency.symbol}
                  style={[
                    styles.currencyOption,
                    selectedCurrency.symbol === currency.symbol && styles.currencyOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedCurrency(currency);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                  <Text style={styles.currencyName}>{currency.name}</Text>
                  {selectedCurrency.symbol === currency.symbol && (
                    <Icon name="check" size={20} color="#A5EA15" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AddExpenseScreen; 