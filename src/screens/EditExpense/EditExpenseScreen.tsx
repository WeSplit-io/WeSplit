import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useExpenseOperations } from '../../hooks/useGroupData';
import { SOLANA_CRYPTOCURRENCIES, Cryptocurrency } from '../../utils/cryptoUtils';
import { firebaseDataService } from '../../services/firebaseDataService';
import { styles } from './styles';

const EditExpenseScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const { groupId, expenseId } = route.params;
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Cryptocurrency>(SOLANA_CRYPTOCURRENCIES[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Use expense operations hook instead of direct service calls
  const {
    updateExpense: handleUpdateExpense,
    deleteExpense: handleDeleteExpense,
    loading: operationsLoading,
    error,
    clearError
  } = useExpenseOperations(groupId || 0);

  // Load expense data
  useEffect(() => {
    const loadExpense = async () => {
      if (!expenseId) {
        Alert.alert('Error', 'No expense ID provided');
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);
        const expenseData = await firebaseDataService.expense.getExpense(expenseId);
        
        if (!expenseData) {
          Alert.alert('Error', 'Expense not found');
          navigation.goBack();
          return;
        }

        setExpense(expenseData);
        setDescription(expenseData.description || '');
        setAmount(expenseData.amount?.toString() || '');
        setSelectedCurrency(
          SOLANA_CRYPTOCURRENCIES.find(c => c.symbol === expenseData.currency) || SOLANA_CRYPTOCURRENCIES[0]
        );

        if (__DEV__) {
          console.log('🔍 EditExpenseScreen: Loaded expense data:', expenseData);
        }
      } catch (error) {
        console.error('Error loading expense:', error);
        Alert.alert('Error', 'Failed to load expense data');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadExpense();
  }, [expenseId, navigation]);

  useEffect(() => {
    if (!expense) return;

    // Check if current user is the creator of the expense
    if (expense.paid_by.toString() !== currentUser?.id?.toString()) {
      Alert.alert('Error', 'You can only edit expenses you created');
      navigation.goBack();
      return;
    }
  }, [expense, currentUser?.id, navigation]);

  const handleUpdateExpenseSubmit = async () => {
    // Clear any previous errors
    clearError();

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!expense) {
      Alert.alert('Error', 'No expense data provided');
      return;
    }

    try {
      console.log('EditExpenseScreen: Updating expense with data:', {
        id: expense.id,
        description: description.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        category: 'general'
      });

      await handleUpdateExpense(expense.id, {
        description: description.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        category: 'general'
      });

      console.log('EditExpenseScreen: Expense updated successfully');

      Alert.alert(
        'Expense Updated!',
        'Your expense has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating expense:', error);
      Alert.alert('Error', 'Failed to update expense. Please try again.');
    }
  };

  const handleDeleteExpenseSubmit = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await handleDeleteExpense(expense.id);
              
              Alert.alert(
                'Expense Deleted!',
                'Your expense has been deleted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Show error from hook if any
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Expense not found.</Text>
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
        <Text style={styles.headerTitle}>Edit Expense</Text>
        <TouchableOpacity onPress={handleDeleteExpenseSubmit} style={styles.deleteButton}>
          <Icon name="trash-2" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
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
              showsVerticalScrollIndicator={false}
            >
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
                  <Text style={styles.currencyOptionIcon}>{currency.icon}</Text>
                  <View style={styles.currencyOptionInfo}>
                    <Text style={[
                      styles.currencyOptionSymbol,
                      selectedCurrency.symbol === currency.symbol && styles.currencyOptionSymbolSelected
                    ]}>
                      {currency.symbol}
                    </Text>
                    <Text style={[
                      styles.currencyOptionName,
                      selectedCurrency.symbol === currency.symbol && styles.currencyOptionNameSelected
                    ]}>
                      {currency.name}
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

        {/* Update Button */}
        <TouchableOpacity 
          style={[styles.updateBtn, operationsLoading && styles.updateBtnDisabled]} 
          onPress={handleUpdateExpenseSubmit}
          disabled={operationsLoading}
        >
          {operationsLoading ? (
            <ActivityIndicator size="small" color="#212121" />
          ) : (
            <Text style={styles.updateBtnText}>Update Expense</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditExpenseScreen; 