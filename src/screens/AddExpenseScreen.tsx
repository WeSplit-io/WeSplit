import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const AddExpenseScreen: React.FC<any> = ({ navigation }) => {
  const { state, addExpense } = useApp();
  const { currentUser, groups } = state;
  
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleSaveExpense = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (groups.length === 0) {
      Alert.alert('Error', 'No groups available. Please create a group first.');
      return;
    }

    const group = groups[selectedGroup];
    const expenseAmount = parseFloat(amount);
    
    // Determine who to split between
    const membersToSplitBetween = selectedMembers.length > 0 
      ? group.members.filter(member => selectedMembers.includes(member.id))
      : group.members;

    if (membersToSplitBetween.length === 0) {
      Alert.alert('Error', 'Please select at least one member to split with');
      return;
    }

    const newExpense = {
      description: description.trim(),
      amount: expenseAmount,
      paidBy: currentUser!,
      splitBetween: membersToSplitBetween,
      groupId: group.id,
      date: new Date().toISOString(),
      category: 'general',
    };

    addExpense(group.id, newExpense);
    
    Alert.alert(
      'Expense Added!',
      'Your expense has been added successfully.',
      [
        {
          text: 'Add Another',
          onPress: () => {
            setDescription('');
            setAmount('');
            setSelectedMembers([]);
          },
        },
        {
          text: 'View Group',
          onPress: () => navigation.navigate('GroupDetails', { groupId: group.id }),
        },
        {
          text: 'Back to Dashboard',
          onPress: () => navigation.navigate('Dashboard'),
        },
      ]
    );
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleGroupChange = (index: number) => {
    setSelectedGroup(index);
    setSelectedMembers([]); // Reset selected members when group changes
  };

  if (groups.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="plus-circle" size={64} color={colors.gray} />
          <Text style={styles.emptyStateText}>No groups available</Text>
          <Text style={styles.emptyStateSubtext}>Create a group first to add expenses</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton} 
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Text style={styles.emptyStateButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentGroup = groups[selectedGroup];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.label}>Group</Text>
      <View style={styles.groupRow}>
        {groups.map((group, idx) => (
          <TouchableOpacity
            key={group.id}
            style={[
              styles.groupIconWrap,
              selectedGroup === idx && styles.groupIconSelected
            ]}
            onPress={() => handleGroupChange(idx)}
          >
            <Icon 
              name={group.category === 'travel' ? 'map-pin' : 'users'} 
              color={group.category === 'travel' ? '#A5A6F6' : '#FF6B6B'} 
              size={24} 
            />
            <Text style={styles.groupIconLabel}>{group.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="What was this expense for?"
        placeholderTextColor={colors.gray}
      />

      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.gray}
          keyboardType="numeric"
        />
        <Text style={styles.currency}>{currentGroup.currency}</Text>
      </View>

      <Text style={styles.label}>Split Type</Text>
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
            color={splitType === 'equal' ? colors.background : colors.gray} 
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
            color={splitType === 'custom' ? colors.background : colors.gray} 
          />
          <Text style={[
            styles.splitOptionText,
            splitType === 'custom' && styles.splitOptionTextSelected
          ]}>
            Custom Split
          </Text>
        </TouchableOpacity>
      </View>

      {splitType === 'custom' && (
        <>
          <Text style={styles.label}>Split Between</Text>
          <View style={styles.membersList}>
            {currentGroup.members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberRow,
                  selectedMembers.includes(member.id) && styles.memberRowSelected
                ]}
                onPress={() => handleMemberToggle(member.id)}
              >
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
                {selectedMembers.includes(member.id) && (
                  <Icon name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveExpense}>
        <Text style={styles.saveBtnText}>Save Expense</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    marginTop: spacing.md,
    marginBottom: 4,
    fontWeight: fontWeights.medium as any,
  },
  groupRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  groupIconWrap: {
    alignItems: 'center',
    marginRight: spacing.lg,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  groupIconSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  groupIconLabel: {
    fontSize: fontSizes.xs,
    color: colors.gray,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  currency: {
    fontSize: fontSizes.lg,
    color: colors.gray,
    marginLeft: spacing.sm,
  },
  splitRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  splitOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.input,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  splitOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  splitOptionText: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  splitOptionTextSelected: {
    color: colors.background,
    fontWeight: fontWeights.semibold as any,
  },
  membersList: {
    backgroundColor: colors.background,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberRowSelected: {
    backgroundColor: colors.primary + '10',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.medium as any,
  },
  memberEmail: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: colors.background,
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
});

export default AddExpenseScreen; 