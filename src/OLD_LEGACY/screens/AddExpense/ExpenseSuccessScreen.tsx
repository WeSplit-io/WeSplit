import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { styles } from './ExpenseSuccessStyles';
import { logger } from '../../services/analytics/loggingService';

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
  logger.debug('Route params', {
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
  
  logger.debug('Conversion values', {
    showConversion,
    convertedAmount,
    convertedCurrency
  });

  const handleGoBack = () => {
    // Navigate back to the group using the group object passed from AddExpenseScreen
    const groupId = route.params.group?.id || route.params.groupId;
    
    logger.info('Navigating back with groupId', { groupId, routeParams: route.params }, 'ExpenseSuccessScreen');
    
    if (groupId) {
      // Ensure groupId is properly converted to string for navigation
      const groupIdString = String(groupId);
      logger.info('Navigating to GroupDetails with groupId', { groupId: groupIdString }, 'ExpenseSuccessScreen');
      navigation.navigate('GroupDetails', { groupId: groupIdString });
    } else {
      // Fallback: go back to the previous screen
      console.warn('⚠️ ExpenseSuccessScreen: No groupId found, going back');
      navigation.goBack();
    }
  };

  // Format current date
  const getCurrentDate = () => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.black}}>
      <View style={[styles.mockupSuccessContainer, {flex: 1, justifyContent: 'space-between', paddingBottom: 0}]}>  
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          {/* Success Icon */}
          <View style={styles.mockupSuccessIcon}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsuccess-icon.png?alt=media&token=6cf1d0fb-7a48-4c4c-aa4c-3c3f76c54f07' }} style={styles.mockupSuccessIconImage} />
          </View>

          {/* Success Title */}
          <Text style={[styles.mockupSuccessTitle, {
            fontSize: 24,
            marginBottom: 8,
          }]}> 
            Expense Added
          </Text>

          {/* Date */}
          <Text style={[styles.mockupSuccessDate, {
            fontSize: 16,
            marginBottom: 40,
          }]}>{getCurrentDate()}</Text>

          {/* Amount Card */}
         {/* <View style={styles.amountCard}>
            <Text style={styles.expenseLabel}>Expense Name</Text>
            <Text style={styles.mainAmount}>
              {amount} {currency}
            </Text>
            {showConversion && (
              <Text style={styles.conversionAmount}>
                {convertedAmount.toFixed(2)} {convertedCurrency}
              </Text>
            )}
          </View>*/}

          {/* Details */}
          {/*<View style={styles.detailsContainer}>
            <Text style={styles.detailText}>
              Added to "{groupName}" group
            </Text>
            <Text style={styles.detailText}>
              Split between {memberCount} member{memberCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.detailText}>
              Description: {description}
            </Text>
          </View>*/}
        </View>
        {/* Back Home Button collé en bas */}
        <View style={{width: '100%', paddingBottom: 24, alignItems: 'center'}}>
          <TouchableOpacity 
            style={[styles.mockupBackHomeButton, {
              paddingVertical: 16,
              paddingHorizontal: 48,
              borderRadius: 12,
              minWidth: '70%',
            }]} 
            onPress={handleGoBack}
          >
            <Text style={[styles.mockupBackHomeButtonText, {
              fontSize: 16,
              fontWeight: '600',
            }]}> 
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ExpenseSuccessScreen; 