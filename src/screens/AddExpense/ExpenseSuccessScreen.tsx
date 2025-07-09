import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from '../../components/Icon';
import { styles } from './ExpenseSuccessStyles';

const ExpenseSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { amount, currency, description, groupName, memberCount } = route.params;
  
  // Mock conversion rate for demonstration (in real app, get from price service)
  const getConversionRate = (currency: string) => {
    const rates: { [key: string]: number } = {
      'SOL': 135,
      'USDC': 1,
      'ETH': 2500,
      'BTC': 45000,
    };
    return rates[currency] || 1;
  };

  const conversionRate = getConversionRate(currency);
  const convertedAmount = currency === 'USDC' ? amount * conversionRate : amount / conversionRate;
  const convertedCurrency = currency === 'USDC' ? 'USD' : 'USDC';

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
          {currency !== 'USDC' && (
            <Text style={styles.conversionAmount}>
              {convertedAmount.toFixed(0)} {convertedCurrency}
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