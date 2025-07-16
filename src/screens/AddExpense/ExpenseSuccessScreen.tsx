import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from '../../components/Icon';
import { styles } from './ExpenseSuccessStyles';

const ExpenseSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { 
    amount, 
    currency, 
    originalAmount, 
    originalCurrency, 
    description, 
    groupName, 
    memberCount 
  } = route.params;
  
  // Debug logging to understand the conversion values
  console.log('🔍 ExpenseSuccessScreen: Route params:', {
    amount,
    currency,
    originalAmount,
    originalCurrency,
    description,
    groupName,
    memberCount
  });
  
  // Show conversion info if original currency was different
  const showConversion = originalCurrency && originalCurrency !== currency;
  
  // Use the actual converted amount passed from AddExpenseScreen
  // amount is already in USDC, so for USD display we use the same value since USDC is pegged to USD
  const convertedAmount = showConversion ? amount : originalAmount;
  const convertedCurrency = showConversion ? 'USD' : currency;
  
  console.log('🔍 ExpenseSuccessScreen: Conversion values:', {
    showConversion,
    convertedAmount,
    convertedCurrency
  });

  const handleGoBack = () => {
    // Navigate back to the group or dashboard
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Icon name="check" size={48} color="#212121" />
        </View>

        {/* Success Message */}
        <Text style={styles.successTitle}>Expense added</Text>
        <Text style={styles.successDate}>
          {new Date().toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </Text>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.expenseLabel}>Expense Name</Text>
          <Text style={styles.mainAmount}>
            {amount} {currency}
          </Text>
          {showConversion && (
            <Text style={styles.conversionAmount}>
              {convertedAmount.toFixed(2)} {convertedCurrency}
            </Text>
          )}
        </View>

        {/* Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>
            Added to "{groupName}" group
          </Text>
          <Text style={styles.detailText}>
            Split between {memberCount} member{memberCount > 1 ? 's' : ''}
          </Text>
          <Text style={styles.detailText}>
            Description: {description}
          </Text>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.goBackButton} onPress={handleGoBack}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ExpenseSuccessScreen; 