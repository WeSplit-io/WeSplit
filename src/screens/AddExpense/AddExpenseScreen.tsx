import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useGroupList, useExpenseOperations } from '../../hooks/useGroupData';
import { GroupWithDetails, GroupMember } from '../../types';
import { SOLANA_CRYPTOCURRENCIES, Cryptocurrency } from '../../utils/cryptoUtils';
import { convertToUSDC } from '../../services/priceService';
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
  const [selectedMembers, setSelectedMembers] = useState<(string | number)[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{[key: string | number]: string}>({});
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showManualTransition, setShowManualTransition] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [paidBy, setPaidBy] = useState<string | number>('');
  const [showPaidBySelector, setShowPaidBySelector] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  // Use expense operations hook - Initialize with selected group ID
  const { 
    createExpense: handleCreateExpense, 
    loading: expenseLoading,
    getGroupMembers,
    error: expenseError,
    clearError
  } = useExpenseOperations(selectedGroup?.id ? selectedGroup.id : (groupId ? groupId : (groups[0]?.id ? groups[0].id : '')));

  // Set initial group when data loads
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      // Set selected group based on route param or first group
      const initialGroup = groupId 
        ? groups.find(g => g.id === (typeof groupId === 'string' ? groupId : Number(groupId))) 
        : groups[0];
        
      if (initialGroup) {
        setSelectedGroup(initialGroup);
        // Initialize selected members with all group members (use real id)
        setSelectedMembers(initialGroup.members.map(m => m.id));
        // Initialize paidBy with current user
        if (currentUser?.id) {
          setPaidBy(currentUser.id);
        }
      }
    }
  }, [groups, groupId, selectedGroup, currentUser]);

  // Get group members using the hook instead of API call
  const groupMembers = getGroupMembers();

  // Debug logging for group members
  useEffect(() => {
    console.log('🔍 AddExpenseScreen: Group members debug:', {
      selectedGroup: selectedGroup?.id,
      groupMembersLength: groupMembers.length,
      groupMembers: groupMembers,
      selectedMembers: selectedMembers
    });
  }, [selectedGroup, groupMembers, selectedMembers]);

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

  const handleMemberToggle = (memberId: string | number) => {
    if (splitType === 'equal') {
      // If trying to deselect in equal mode, switch to manual
      if (selectedMembers.includes(memberId)) {
        setSplitType('manual');
        // Show transition notification
        setShowManualTransition(true);
        setTimeout(() => setShowManualTransition(false), 3000);
        
        // Remove the member from selectedMembers
        setSelectedMembers(prev => prev.filter(id => id !== memberId));
        // Initialize customAmounts for remaining members with equal split value
        const newCustomAmounts: {[key: string | number]: string} = {};
        const remainingMembers = selectedMembers.filter(id => id !== memberId);
        const amountPerPerson = remainingMembers.length > 0 ? (parseFloat(amount) || 0) / remainingMembers.length : 0;
        remainingMembers.forEach(id => {
          newCustomAmounts[id] = amountPerPerson.toFixed(2);
        });
        setCustomAmounts(newCustomAmounts);
      } else {
        // Adding a member in equal mode - just add them normally
        setSelectedMembers(prev => [...prev, memberId]);
      }
    } else {
      // Manual mode: toggle as usual
      if (selectedMembers.includes(memberId)) {
        // Removing a member in manual mode
        const remainingMembers = selectedMembers.filter(id => id !== memberId);
        setSelectedMembers(prev => prev.filter(id => id !== memberId));
        
        // Recalculate amounts for remaining members
        if (remainingMembers.length > 0) {
          const totalAmount = parseFloat(amount) || 0;
          const amountPerRemainingMember = totalAmount / remainingMembers.length;
          
          const newCustomAmounts: {[key: string | number]: string} = {};
          remainingMembers.forEach(id => {
            newCustomAmounts[id] = amountPerRemainingMember.toFixed(2);
          });
          setCustomAmounts(newCustomAmounts);
        } else {
          // No members left, clear custom amounts
          setCustomAmounts({});
        }
      } else {
        // Adding a member in manual mode
        setSelectedMembers(prev => [...prev, memberId]);
        // Initialize the new member's amount with equal split value
        const amountPerPerson = (parseFloat(amount) || 0) / (selectedMembers.length + 1);
        setCustomAmounts(prev => ({
          ...prev,
          [memberId]: amountPerPerson.toFixed(2)
        }));
      }
    }
  };

  const getTotalAmount = () => {
    if (splitType === 'equal') {
      return parseFloat(amount) || 0;
    } else {
      return Object.values(customAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
    }
  };

  const getAmountPerPerson = () => {
    // Use converted USDC amount if available, otherwise use original amount
    const totalAmount = convertedAmount || parseFloat(amount) || 0;
    return selectedMembers.length > 0 ? totalAmount / selectedMembers.length : 0;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const handleManualAmountChange = (memberId: string | number, value: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [memberId]: value
    }));
  };

  const handleSplitTypeChange = (newSplitType: 'equal' | 'manual') => {
    setSplitType(newSplitType);
    
    if (newSplitType === 'manual' && selectedMembers.length > 0) {
      // Initialize custom amounts for all selected members with current equal split values
      const newCustomAmounts: {[key: string | number]: string} = {};
      // Use converted USDC amount if available, otherwise use original amount
      const totalAmount = convertedAmount || parseFloat(amount) || 0;
      const amountPerPerson = selectedMembers.length > 0 ? totalAmount / selectedMembers.length : 0;
      selectedMembers.forEach(id => {
        newCustomAmounts[id] = amountPerPerson.toFixed(2);
      });
      setCustomAmounts(newCustomAmounts);
    } else if (newSplitType === 'equal') {
      // Clear custom amounts when switching back to equal mode
      setCustomAmounts({});
    }
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
      console.log('🔍 AddExpenseScreen: Starting expense creation...');
      console.log('🔍 AddExpenseScreen: Selected group:', selectedGroup);
      console.log('🔍 AddExpenseScreen: Current user:', currentUser);
      console.log('🔍 AddExpenseScreen: Selected members:', selectedMembers);
      console.log('🔍 AddExpenseScreen: Description:', description);
      console.log('🔍 AddExpenseScreen: Amount:', amount);
      console.log('🔍 AddExpenseScreen: Currency:', selectedCurrency.symbol);

      // Convert amount to USDC if currency is not USDC
      let finalAmount = parseFloat(amount);
      let finalCurrency = selectedCurrency.symbol;
      let convertedCustomAmounts = customAmounts;
      
      if (selectedCurrency.symbol !== 'USDC') {
        try {
          setIsConverting(true);
          const usdcAmount = await convertToUSDC(finalAmount, selectedCurrency.symbol);
          finalAmount = usdcAmount;
          finalCurrency = 'USDC';
          setConvertedAmount(usdcAmount);
          console.log(`Converted ${amount} ${selectedCurrency.symbol} to ${finalAmount} USDC`);
          
          // Also convert custom amounts if in manual mode
          if (splitType === 'manual' && Object.keys(customAmounts).length > 0) {
            convertedCustomAmounts = {};
            for (const [memberId, memberAmount] of Object.entries(customAmounts)) {
              const memberAmountNum = parseFloat(memberAmount);
              if (!isNaN(memberAmountNum)) {
                const convertedMemberAmount = await convertToUSDC(memberAmountNum, selectedCurrency.symbol);
                convertedCustomAmounts[memberId] = convertedMemberAmount.toFixed(2);
              }
            }
            console.log(`Converted custom amounts to USDC:`, convertedCustomAmounts);
          }
        } catch (conversionError) {
          console.error('Currency conversion failed:', conversionError);
          // Continue with original currency if conversion fails
        } finally {
          setIsConverting(false);
        }
      } else {
        setConvertedAmount(null);
      }

      // Prepare split data without undefined values
      const splitData: any = {
        memberIds: selectedMembers,
        amountPerPerson: getAmountPerPerson()
      };
      
      if (splitType === 'manual' && Object.keys(convertedCustomAmounts).length > 0) {
        splitData.customAmounts = convertedCustomAmounts;
      }

      const expenseData = {
        description: description.trim(),
        amount: finalAmount,
        currency: finalCurrency,
        paid_by: paidBy, // Use the selected paidBy value, snake_case for backend compatibility
        groupId: selectedGroup.id, // Keep as string for Firebase compatibility
        category: categories[selectedCategory].name.toLowerCase(),
        splitType: splitType,
        splitData: splitData
      };

      console.log('🔍 AddExpenseScreen: Expense data to be created:', expenseData);
      console.log('🔍 AddExpenseScreen: Calling handleCreateExpense...');

      const result = await handleCreateExpense(expenseData);
      
      console.log('🔍 AddExpenseScreen: Expense created successfully:', result);
      
      // Navigate to success screen
      navigation.navigate('ExpenseSuccess', {
        amount: finalAmount,
        currency: finalCurrency,
        originalAmount: parseFloat(amount),
        originalCurrency: selectedCurrency.symbol,
        description: description.trim(),
        groupName: selectedGroup.name,
        memberCount: selectedMembers.length
      });
      
    } catch (error) {
      console.error('❌ AddExpenseScreen: Error creating expense:', error);
      console.error('❌ AddExpenseScreen: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      Alert.alert('Error', 'Failed to create expense. Please try again.');
    }
  };

  // Show error from hook if any
  useEffect(() => {
    if (expenseError) {
      Alert.alert('Error', expenseError);
    }
  }, [expenseError]);

  // Real-time conversion preview
  useEffect(() => {
    const updateConversionPreview = async () => {
      if (amount && selectedCurrency.symbol !== 'USDC') {
        try {
          const amountNum = parseFloat(amount);
          if (!isNaN(amountNum)) {
            const usdcAmount = await convertToUSDC(amountNum, selectedCurrency.symbol);
            setConvertedAmount(usdcAmount);
          }
        } catch (error) {
          console.error('Error updating conversion preview:', error);
          setConvertedAmount(null);
        }
      } else {
        setConvertedAmount(null);
      }
    };

    updateConversionPreview();
  }, [amount, selectedCurrency.symbol]);

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
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>
              Total: {getTotalAmount().toFixed(3)} {selectedCurrency.symbol}
            </Text>
            {isConverting && (
              <Text style={styles.convertingText}>
                Converting to USDC...
              </Text>
            )}
            {convertedAmount && selectedCurrency.symbol !== 'USDC' && (
              <Text style={styles.convertedText}>
                ≈ {convertedAmount.toFixed(2)} USDC
              </Text>
            )}
          </View>
        )}

        {/* Paid By */}
        <Text style={styles.sectionLabel}>Paid By</Text>
        <TouchableOpacity 
          style={styles.paidBySelector}
          onPress={() => setShowPaidBySelector(true)}
        >
          <View style={styles.paidByInfo}>
            <View style={styles.paidByAvatar}>
              <Text style={styles.paidByAvatarText}>
                {groupMembers.find(m => m.id === paidBy)?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.paidByDetails}>
              <Text style={styles.paidByName}>
                {groupMembers.find(m => m.id === paidBy)?.name || 'Select who paid'}
              </Text>
              <Text style={styles.paidByEmail}>
                {groupMembers.find(m => m.id === paidBy)?.email || ''}
              </Text>
            </View>
          </View>
          <Icon name="chevron-down" size={20} color="#A89B9B" />
        </TouchableOpacity>

        {/* Split Amount */}
        <View style={styles.splitHeader}>
          <Text style={styles.sectionLabel}>Split Amount</Text>
          <View style={styles.splitToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, splitType === 'equal' && styles.toggleButtonActive]}
              onPress={() => handleSplitTypeChange('equal')}
            >
              <Text style={[styles.toggleText, splitType === 'equal' && styles.toggleTextActive]}>
                Equal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, splitType === 'manual' && styles.toggleButtonActive]}
              onPress={() => handleSplitTypeChange('manual')}
            >
              <Text style={[styles.toggleText, splitType === 'manual' && styles.toggleTextActive]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transition Notification */}
        {showManualTransition && (
          <View style={styles.transitionNotification}>
            <Icon name="info" size={16} color="#A5EA15" />
            <Text style={styles.transitionText}>Switched to manual split mode</Text>
          </View>
        )}

        {/* Members List */}
        {groupMembers.map((member, index) => {
          const isSelected = selectedMembers.includes(member.id);
          const memberAmount = splitType === 'equal' 
            ? getAmountPerPerson() 
            : parseFloat(customAmounts[member.id] || '0');
          
          // Determine which currency to display
          const displayCurrency = convertedAmount && selectedCurrency.symbol !== 'USDC' ? 'USDC' : selectedCurrency.symbol;

          return (
            <View key={`${member.id}-${index}`}>
              <TouchableOpacity
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
                
                {isSelected && amount && splitType === 'equal' && (
                  <Text style={styles.memberAmount}>
                    ${memberAmount.toFixed(2)}
                  </Text>
                )}
              </TouchableOpacity>
              
              {/* Manual Amount Input - Only show for selected members in manual mode */}
              {isSelected && splitType === 'manual' && amount && (
                <View style={styles.manualAmountContainer}>
                  <Text style={styles.manualAmountLabel}>Amount for {member.name}:</Text>
                  <View style={styles.manualAmountRow}>
                    <TextInput
                      style={styles.manualAmountInput}
                      value={customAmounts[member.id] || '0'}
                      onChangeText={(value) => handleManualAmountChange(member.id, value)}
                      placeholder="0.00"
                      placeholderTextColor="#A89B9B"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.manualAmountCurrency}>{displayCurrency}</Text>
                  </View>
                </View>
              )}
            </View>
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

      {/* Paid By Selector Modal */}
      <Modal
        visible={showPaidBySelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaidBySelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.currencyModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Who Paid?</Text>
              <TouchableOpacity onPress={() => setShowPaidBySelector(false)}>
                <Icon name="x" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {groupMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.currencyOption,
                    paidBy === member.id && styles.currencyOptionSelected
                  ]}
                  onPress={() => {
                    setPaidBy(member.id);
                    setShowPaidBySelector(false);
                  }}
                >
                  <View style={styles.paidByOptionContent}>
                    <View style={styles.paidByOptionAvatar}>
                      <Text style={styles.paidByOptionAvatarText}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.paidByOptionDetails}>
                      <Text style={styles.paidByOptionName}>{member.name}</Text>
                      <Text style={styles.paidByOptionEmail}>{member.email}</Text>
                    </View>
                  </View>
                  {paidBy === member.id && (
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