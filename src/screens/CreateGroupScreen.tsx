import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const categories = [
  { name: 'Travel', icon: 'map-pin', color: '#A5A6F6' },
  { name: 'Food', icon: 'coffee', color: '#B5C99A' },
  { name: 'Work', icon: 'briefcase', color: '#F7C873' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#FF6B6B' },
  { name: 'Home', icon: 'home', color: '#4ECDC4' },
  { name: 'Other', icon: 'more-horizontal', color: '#95A5A6' },
];

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

const CreateGroupScreen: React.FC<any> = ({ navigation }) => {
  const { state, addGroup } = useApp();
  const { currentUser } = state;
  
  const [selectedCat, setSelectedCat] = useState(0);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleDone = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title');
      return;
    }

    if (!desc.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const newGroup = {
      name: title.trim(),
      description: desc.trim(),
      category: categories[selectedCat].name.toLowerCase(),
      currency,
      members: currentUser ? [currentUser] : [],
      expenses: [],
    };

    addGroup(newGroup);
    
    Alert.alert(
      'Group Created!',
      'Your group has been created successfully. What would you like to do next?',
      [
        {
          text: 'Back to Dashboard',
          style: 'cancel',
          onPress: () => navigation.navigate('Dashboard'),
        },
        {
          text: 'Add Members',
          onPress: () => navigation.navigate('AddMembers', { groupId: Date.now().toString() }),
        },
        {
          text: 'Add First Expense',
          onPress: () => navigation.navigate('AddExpense'),
        },
      ]
    );
  };

  const handleAddMembers = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a group title first');
      return;
    }
    navigation.navigate('AddMembers', { groupId: 'new' });
  };

  const handleInviteLink = () => {
    Alert.alert('Invite Link', 'Share this link with your friends to invite them to the group:\n\nhttps://wesplit.app/join/group123');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Group</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.catRow}>
        {categories.map((cat, idx) => (
          <TouchableOpacity
            key={cat.name}
            style={[styles.catIconWrap, selectedCat === idx && styles.catIconSelected]}
            onPress={() => setSelectedCat(idx)}
          >
            <Icon name={cat.icon} color={cat.color} size={28} />
            <Text style={styles.catIconLabel}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.label}>Group Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Group name"
        placeholderTextColor={colors.gray}
      />
      
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 60 }]}
        value={desc}
        onChangeText={setDesc}
        placeholder="Description"
        placeholderTextColor={colors.gray}
        multiline
      />
      
      <Text style={styles.label}>Currency</Text>
      <TouchableOpacity 
        style={styles.selectInput}
        onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
      >
        <Text style={styles.selectInputText}>{currency}</Text>
        <Icon name="chevron-down" size={20} color={colors.gray} />
      </TouchableOpacity>

      {showCurrencyPicker && (
        <View style={styles.currencyPicker}>
          {currencies.map((curr) => (
            <TouchableOpacity
              key={curr}
              style={[styles.currencyOption, currency === curr && styles.currencyOptionSelected]}
              onPress={() => {
                setCurrency(curr);
                setShowCurrencyPicker(false);
              }}
            >
              <Text style={[styles.currencyOptionText, currency === curr && styles.currencyOptionTextSelected]}>
                {curr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <TouchableOpacity style={styles.linkRow} onPress={handleAddMembers}>
        <Icon name="user-plus" size={20} color={colors.primary} />
        <Text style={styles.linkText}>Add new members</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.linkRow} onPress={handleInviteLink}>
        <Icon name="link" size={20} color={colors.primary} />
        <Text style={styles.linkText}>Invite via link</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
        <Text style={styles.doneBtnText}>Create Group</Text>
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
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  catIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.card,
    width: '30%',
  },
  catIconSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  catIconLabel: {
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
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.input,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  currencyPicker: {
    backgroundColor: colors.background,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  currencyOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currencyOptionSelected: {
    backgroundColor: colors.primary,
  },
  currencyOptionText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  currencyOptionTextSelected: {
    color: colors.background,
    fontWeight: fontWeights.semibold as any,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.input,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  linkText: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.md,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  doneBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: colors.background,
  },
});

export default CreateGroupScreen; 