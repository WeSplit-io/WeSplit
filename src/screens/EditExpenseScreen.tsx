import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { SOLANA_CRYPTOCURRENCIES, Cryptocurrency } from '../utils/cryptoUtils';
import { updateExpense, deleteExpense } from '../services/expenseService';

const EditExpenseScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const expense = route.params?.expense;
  const onExpenseUpdated = route.params?.onExpenseUpdated;
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [selectedCurrency, setSelectedCurrency] = useState<Cryptocurrency>(
    SOLANA_CRYPTOCURRENCIES.find(c => c.symbol === expense?.currency) || SOLANA_CRYPTOCURRENCIES[0]
  );
  const [loading, setLoading] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    if (!expense) {
      Alert.alert('Error', 'No expense data provided');
      navigation.goBack();
      return;
    }

    // Check if current user is the creator of the expense
    if (expense.paid_by.toString() !== currentUser?.id?.toString()) {
      Alert.alert('Error', 'You can only edit expenses you created');
      navigation.goBack();
      return;
    }
  }, [expense, currentUser?.id]);

  const handleUpdateExpense = async () => {
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

    setLoading(true);

    try {
      console.log('EditExpenseScreen: Updating expense with data:', {
        id: expense.id,
        description: description.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        category: 'general'
      });

      const updatedExpense = await updateExpense(expense.id, {
        description: description.trim(),
        amount: parseFloat(amount),
        currency: selectedCurrency.symbol,
        category: 'general'
      });

      console.log('EditExpenseScreen: Expense updated successfully:', updatedExpense);
      console.log('EditExpenseScreen: Original expense currency:', expense.currency);
      console.log('EditExpenseScreen: New selected currency:', selectedCurrency.symbol);

      // Call the callback to refresh the parent screen
      if (onExpenseUpdated) {
        console.log('EditExpenseScreen: Calling onExpenseUpdated callback');
        onExpenseUpdated();
      } else {
        console.log('EditExpenseScreen: No onExpenseUpdated callback provided');
      }
      
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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = () => {
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
            setLoading(true);
            try {
              await deleteExpense(expense.id);
              // Call the callback to refresh the parent screen
              if (onExpenseUpdated) {
                onExpenseUpdated();
              }
              
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
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!expense) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading expense...</Text>
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
        <TouchableOpacity onPress={handleDeleteExpense} style={styles.deleteButton}>
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

        {/* Update Button */}
        <TouchableOpacity 
          style={[styles.updateBtn, loading && styles.updateBtnDisabled]} 
          onPress={handleUpdateExpense}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#212121" />
          ) : (
            <Text style={styles.updateBtnText}>Update Expense</Text>
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
  deleteButton: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  updateBtn: {
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
  updateBtnDisabled: {
    opacity: 0.6,
  },
  updateBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
});

export default EditExpenseScreen; 