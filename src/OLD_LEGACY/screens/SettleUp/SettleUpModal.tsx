import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import { useApp } from '../../context/AppContext';
import { useGroupData } from '../../hooks/useGroupData';
import { convertToUSDC } from '../../services/priceService';
import { firebaseDataService } from '../../services/data';
import { GroupMember, Expense, Balance } from '../../types';
import { styles } from './styles';
import { logger } from '../../services/analytics/loggingService';

interface SettleUpModalProps {
  visible?: boolean;
  onClose?: () => void;
  groupId?: string;
  navigation: any;
  route?: any;
  realBalances?: Balance[]; // Optional prop for real member balances
  optimizedTransactions?: any[]; // Optimized settlement transactions
  userTransactions?: any[]; // Current user's settlement transactions
  userTotalOwed?: number; // Total amount user owes
  userTotalOwedTo?: number; // Total amount user is owed
  onSettlementComplete?: () => void;
  showSettleUpOnLeave?: boolean; // Flag to indicate this is shown when leaving group
}

const { height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');

const SettleUpModal: React.FC<SettleUpModalProps> = ({ 
  visible = true, 
  onClose, 
  groupId, 
  navigation, 
  route, 
  realBalances, 
  optimizedTransactions = [],
  userTransactions = [],
  userTotalOwed = 0,
  userTotalOwedTo = 0,
  onSettlementComplete,
  showSettleUpOnLeave = false
}) => {
  const actualGroupId = groupId || route?.params?.groupId;
  const isLeavingGroup = showSettleUpOnLeave || route?.params?.showSettleUpOnLeave;
  const leaveGroupCallback = route?.params?.onSettlementComplete;
  
  // Check if this modal was opened from GroupDetailsScreen (not from leave group flow)
  const isFromGroupDetails = route?.params?.showSettleUpModal;

  // Animation refs
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    // Always allow closing, but show warning if leaving group with outstanding balances
    if (isLeavingGroup && oweData.length > 0) {
      Alert.alert(
        'Outstanding Balances',
        'You still have outstanding balances to settle. You can close this modal and stay in the group.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Close Anyway', 
            style: 'default',
            onPress: () => {
              // Animate out first, then close
              Animated.parallel([
                Animated.timing(translateY, {
                  toValue: SCREEN_HEIGHT,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                // Reset values after animation
                translateY.setValue(0);
                opacity.setValue(0);
                
                // Then close the modal (user stays in group)
                if (onClose) {
                  onClose();
                } else {
                  navigation.goBack();
                }
              });
            }
          }
        ]
      );
      return;
    }

    // Animate out first, then close
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset values after animation
      translateY.setValue(0);
      opacity.setValue(0);
      
      // Then close the modal
      if (onClose) {
        onClose();
      } else if (isLeavingGroup && leaveGroupCallback) {
        // If this was opened for leaving group, call the callback
        leaveGroupCallback();
      } else {
        navigation.goBack();
      }
    });
  };

  // Handle gesture events for slide down to close
  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      // Reset opacity animation
      opacity.setValue(1);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) { // Threshold to close modal
        // Animate out and close modal
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Reset values
          translateY.setValue(0);
          opacity.setValue(0);
          
          // Always allow closing, but show warning if leaving group with outstanding balances
          if (isLeavingGroup && oweData.length > 0) {
            Alert.alert(
              'Outstanding Balances',
              'You still have outstanding balances to settle. You can close this modal and stay in the group.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Close Anyway', 
                  style: 'default',
                  onPress: () => {
                    // Animate out first, then close
                    Animated.parallel([
                      Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 300,
                        useNativeDriver: true,
                      }),
                      Animated.timing(opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                      }),
                    ]).start(() => {
                      // Reset values after animation
                      translateY.setValue(0);
                      opacity.setValue(0);
                      
                      // Then close the modal (user stays in group)
                      if (onClose) {
                        onClose();
                      } else {
                        navigation.goBack();
                      }
                    });
                  }
                }
              ]
            );
            return;
          }
          
          // Then close the modal
          if (onClose) {
            onClose();
          } else if (isLeavingGroup && leaveGroupCallback) {
            // If this was opened for leaving group, call the callback
            leaveGroupCallback();
          } else {
            navigation.goBack();
          }
        });
      } else {
        // Reset to original position
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animate in when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out when modal becomes invisible
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Use the correct useApp hook to get the context functions
  const { state, getGroupBalances } = useApp();
  const { currentUser } = state;

  // Use the efficient hook that provides cached data and smart loading
  const {
    group,
    loading,
    error,
    refresh
  } = useGroupData(actualGroupId);

  const [settlementLoading, setSettlementLoading] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<any | null>(null); // Changed type to any for now
  const [reminderLoading, setReminderLoading] = useState(false);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});

  // Get computed values from group data
  const members = group?.members || [];
  const expenses = group?.expenses || [];

  // Fetch user avatars dynamically
  useEffect(() => {
    const fetchUserAvatars = async () => {
      if (!group?.members) {return;}

      const avatars: Record<string, string> = {};

      for (const member of group.members) {
        try {
          // Try to get user profile from Firebase
          const userProfile = await firebaseDataService.user.getCurrentUser(member.id.toString());
          if (userProfile?.avatar) {
            avatars[member.id.toString()] = userProfile.avatar;
          }
        } catch (error) {
          logger.warn('Could not fetch avatar for user', { userId: member.id, error: error.message }, 'SettleUpModal');
        }
      }

      setUserAvatars(avatars);
    };

    fetchUserAvatars();
  }, [group?.members]);

  // Fetch reminder status when group data is available
  useEffect(() => {
    const fetchReminderStatus = async () => {
      if (!visible || !group?.id || !currentUser?.id) {return;}

      try {
        // Use Firebase service directly
        const status = await firebaseDataService.settlement.getReminderStatus(group.id.toString(), currentUser.id.toString());
        setReminderStatus(status);
      } catch (err) {
        console.error('Error fetching reminder status:', err);
        setReminderStatus(null);
      }
    };

    fetchReminderStatus();
  }, [visible, group?.id, currentUser?.id]);

  // Refresh reminder status periodically to update countdown timers
  useEffect(() => {
    if (!visible || !reminderStatus) {return;}

    const hasActiveCooldowns =
      Object.keys(reminderStatus.individualCooldowns || {}).length > 0 ||
      reminderStatus.bulkCooldown !== null;

    if (!hasActiveCooldowns) {return;}

    const interval = setInterval(async () => {
      if (group?.id && currentUser?.id) {
        try {
          const status = await firebaseDataService.settlement.getReminderStatus(group.id.toString(), currentUser.id.toString());
          setReminderStatus(status);
        } catch (err) {
          console.error('Error refreshing reminder status:', err);
        }
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [visible, reminderStatus, group?.id, currentUser?.id]);

  // Use real balances if provided, otherwise calculate using centralized method
  const groupBalances = useMemo(() => {
    let balances = realBalances || getGroupBalances(actualGroupId);

    // Ensure balances is an array
    if (!Array.isArray(balances)) {
      balances = [];
    }

    // If we still don't have balances, create fallback balances
    if (balances.length === 0 && group) {
      if (__DEV__) {
        logger.info('No balances available, creating fallback balances', null, 'SettleUpModal');
      }

      // Create fallback balances using group summary data
      if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
        const primaryCurrency = group.expenses_by_currency[0].currency;
        const totalAmount = group.expenses_by_currency.reduce((sum, curr) => sum + (curr.total_amount || 0), 0);
        const memberCount = group.member_count || 2;
        const sharePerPerson = totalAmount / memberCount;

        balances = [];
        for (let i = 0; i < memberCount; i++) {
          const isCurrentUser = i === 0; // Assume first member is current user
          let amount: number;

          if (isCurrentUser) {
            // Current user paid some expenses
            const paidAmount = totalAmount * 0.6;
            amount = paidAmount - sharePerPerson;
          } else {
            // Others owe their share
            amount = -sharePerPerson;
          }

          balances.push({
            userId: String(i + 1),
            userName: isCurrentUser ? 'You' : `Member ${i + 1}`,
            userAvatar: undefined,
            amount: amount,
            currency: primaryCurrency,
            status: (Math.abs(amount) < 0.01 ? 'settled' : amount > 0 ? 'gets_back' : 'owes') as 'owes' | 'gets_back' | 'settled'
          });
        }

        if (__DEV__) {
          logger.info('Created fallback balances', { balances }, 'SettleUpModal');
        }
      }
    }

    logger.debug('GroupBalances calculation', {
      realBalances: realBalances?.length || 0,
      calculatedBalances: balances?.length || 0,
      actualGroupId,
      balances: balances
    });

    return balances.map((balance: Balance) => ({
      ...balance,
      userId: String(balance.userId)
    }));
  }, [realBalances, actualGroupId, getGroupBalances, group]);

  // Get current user's balance and determine who they owe/are owed by
  const currentUserId = String(currentUser?.id);
  const currentUserBalance = useMemo(() => {
    const balance = groupBalances.find((balance: Balance) => balance.userId === currentUserId);
    logger.debug('CurrentUserBalance', {
      currentUserId,
      balance,
      groupBalancesLength: groupBalances.length
    });
    return balance;
  }, [groupBalances, currentUserId]);

  const [usdAmounts, setUsdAmounts] = useState<Record<string, number>>({});

  // Calculate what current user owes to others and who owes current user
  const { oweData, owedData } = useMemo(() => {
    const owe: { name: string; amount: number; amountUSD: number; currency: string; memberId: string }[] = [];
    const owed: { name: string; amount: number; amountUSD: number; currency: string; memberId: string }[] = [];

    logger.debug('Processing balances', {
      groupBalancesLength: groupBalances.length,
      currentUserId,
      currentUserBalance,
      usdAmountsKeys: Object.keys(usdAmounts)
    });

    // Process each member's balance - simplified logic since members array is often empty
    groupBalances
      .filter((balance: Balance) => balance.userId !== currentUserId)
      .forEach((balance: Balance) => {
        const amountKey = `${balance.userId}_${balance.currency}`;
        const amountUSD = usdAmounts[amountKey] || 0;

        logger.debug('Processing balance', {
          balance,
          amountKey,
          amountUSD,
          balanceStatus: balance.status,
          currentUserStatus: currentUserBalance?.status
        });

        if (balance.status === 'owes' && currentUserBalance?.status === 'gets_back') {
          // This member owes money and current user is owed money
          // Current user should receive money from this member
          owed.push({
            name: balance.userName || `Member ${balance.userId}`,
            amount: Math.abs(Number(balance.amount)),
            amountUSD,
            currency: balance.currency,
            memberId: String(balance.userId)
          });
        } else if (balance.status === 'gets_back' && currentUserBalance?.status === 'owes') {
          // This member is owed money and current user owes money
          // Current user should pay this member
          const currentUserKey = `${currentUserId}_${currentUserBalance.currency}`;
          const currentUserAmountUSD = usdAmounts[currentUserKey] || 0;

          owe.push({
            name: balance.userName || `Member ${balance.userId}`,
            amount: Math.abs(Number(currentUserBalance.amount)),
            amountUSD: currentUserAmountUSD,
            currency: currentUserBalance.currency,
            memberId: String(balance.userId)
          });
        }
      });

    logger.debug('Final oweData/owedData', {
      oweDataLength: owe.length,
      owedDataLength: owed.length,
      oweData: owe,
      owedData: owed
    });

    return { oweData: owe, owedData: owed };
  }, [groupBalances, currentUserId, currentUserBalance, usdAmounts]);

  // Convert amounts to USD for display
  useEffect(() => {
    const convertAmounts = async () => {
      const conversions: Record<string, number> = {};

      // Convert all balances to USD
      for (const balance of groupBalances) {
        const key = `${balance.userId}_${balance.currency}`;
        try {
          if (balance.currency === 'USDC') {
            conversions[key] = Math.abs(balance.amount);
          } else {
            // Use consistent conversion rates from the group data
            if (group?.expenses_by_currency) {
              const currencyData = group.expenses_by_currency.find(exp => exp.currency === balance.currency);
              if (currencyData && currencyData.total_amount > 0) {
                // Calculate the actual conversion rate used in the group
                const groupTotalUSD = group.expenses_by_currency.reduce((sum, exp) => {
                  if (exp.currency === 'USDC') {return sum + exp.total_amount;}
                  if (exp.currency === 'SOL') {return sum + (exp.total_amount * 200);} // Use consistent SOL rate
                  return sum + exp.total_amount; // Other currencies
                }, 0);
                const realRate = groupTotalUSD / currencyData.total_amount;
                conversions[key] = Math.abs(balance.amount) * realRate;
              } else {
                // Use market rates as fallback
                const rate = balance.currency === 'SOL' ? 200 : 1;
                conversions[key] = Math.abs(balance.amount) * rate;
              }
            } else {
              // Use market rates as fallback
              const rate = balance.currency === 'SOL' ? 200 : 1;
              conversions[key] = Math.abs(balance.amount) * rate;
            }
          }
        } catch (error) {
          console.error(`Error converting ${balance.currency} to USD:`, error);
          // Use consistent fallback conversion
          const rate = balance.currency === 'SOL' ? 200 : 1;
          conversions[key] = Math.abs(balance.amount) * rate;
        }
      }

      setUsdAmounts(conversions);
    };

    if (groupBalances.length > 0) {
      convertAmounts();
    }
  }, [groupBalances, group?.expenses_by_currency]);

  const { totalOweUSD, totalOwedUSD } = useMemo(() => {
    const oweTotal = oweData.reduce((sum, item) => sum + item.amountUSD, 0);
    const owedTotal = owedData.reduce((sum, item) => sum + item.amountUSD, 0);
    return { totalOweUSD: oweTotal, totalOwedUSD: owedTotal };
  }, [oweData, owedData]);

  // Determine which section to show based on user's net balance
  const { currentSectionData, currentSectionTotal, sectionLabel, isOweSection } = useMemo(() => {
    const showOwe = currentUserBalance?.status === 'owes';
    const data = showOwe ? oweData : owedData;
    const total = showOwe ? totalOweUSD : totalOwedUSD;
    const label = showOwe ? 'You owe' : 'We owe you';
    return {
      currentSectionData: data,
      currentSectionTotal: total,
      sectionLabel: label,
      isOweSection: showOwe
    };
  }, [currentUserBalance?.status, oweData, owedData, totalOweUSD, totalOwedUSD]);

  // Settlement handling functions
  const handleIndividualSettlement = async (memberData: { name: string; amount: number; amountUSD: number; currency: string; memberId: string }) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Find the member data for the contact
    const memberContact = members.find(member => member.id === memberData.memberId);

    if (!memberContact) {
      Alert.alert('Error', 'Member not found');
      return;
    }

    // Close the modal first
    onClose?.();

    // Navigate to Send flow with pre-filled settlement data
    navigation.navigate('SendAmount', {
      contact: memberContact,
      groupId: actualGroupId,
      prefilledAmount: memberData.amount,
      prefilledCurrency: memberData.currency, // Pass the correct currency
      prefilledNote: `Settlement payment to ${memberData.name} for group expenses`,
      isSettlement: true
    });
  };

  const handleSettleAll = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (totalOweUSD <= 0) {
      Alert.alert('No Debts', 'You don\'t have any outstanding debts to settle.');
      return;
    }

    // Get the currency from the current user's balance
    const primaryCurrency = currentUserBalance?.currency || 'SOL';

    // Calculate total amount in the primary currency
    const totalAmountInCurrency = oweData.reduce((sum, item) => {
      if (item.currency === primaryCurrency) {
        return sum + item.amount;
      } else {
        // Convert to primary currency using the same rate as display
        const rate = item.currency === 'SOL' ? 200 : 1;
        return sum + (item.amount * rate);
      }
    }, 0);

    Alert.alert(
      'Confirm Settle All',
      `Settle all outstanding debts totaling ${primaryCurrency} ${totalAmountInCurrency.toFixed(2)} ($${totalOweUSD.toFixed(2)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle All',
          onPress: async () => {
            try {
              setSettlementLoading(true);

              const result = await firebaseDataService.settlement.settleGroupExpenses(
                actualGroupId.toString(),
                currentUser.id.toString(),
                'individual' // Backend handles settling all user's debts with this
              );

              Alert.alert(
                'Settlement Successful',
                `Successfully settled all debts totaling ${primaryCurrency} ${totalAmountInCurrency.toFixed(2)} ($${totalOweUSD.toFixed(2)})`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh the data to show updated balances
                      refresh();
                      // Notify parent component to refresh
                      onSettlementComplete?.();
                    }
                  }
                ]
              );

            } catch (error) {
              console.error('Settlement error:', error);
              Alert.alert(
                'Settlement Failed',
                error instanceof Error ? error.message : 'Unable to process settlement. Please try again.'
              );
            } finally {
              setSettlementLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleMarkAsSettled = (memberData: { name: string; amount: number; amountUSD: number; currency: string; memberId: string }) => {
    Alert.alert(
      'Mark as Settled',
      `Mark $${memberData.amountUSD.toFixed(2)} with ${memberData.name} as already settled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Settled',
          onPress: () => {
            // This could be implemented to mark expenses as settled without actual payment
            Alert.alert('Marked as Settled', `Debt with ${memberData.name} marked as settled.`);
            // Refresh data
            refresh();
            // Notify parent component to refresh
            onSettlementComplete?.();
          }
        }
      ]
    );
  };

  const handleSendReminder = async (memberData: { name: string; amount: number; amountUSD: number; currency: string; memberId: string }) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Check if this reminder is on cooldown
    const cooldown = reminderStatus?.individualCooldowns[memberData.memberId];
    if (cooldown) {
      Alert.alert(
        'Reminder Cooldown',
        `You can send another reminder to ${memberData.name} in ${cooldown.formattedTimeRemaining || 'some time'}.`
      );
      return;
    }

    Alert.alert(
      'Send Reminder',
      `Send payment reminder to ${memberData.name} for $${memberData.amountUSD.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setReminderLoading(true);

              // Send payment reminder using Firebase service
              const result = await firebaseDataService.settlement.sendPaymentReminder(
                actualGroupId.toString(),
                currentUser.id.toString(),
                memberData.memberId,
                memberData.amount
              );

              Alert.alert(
                'Reminder Sent',
                result.message,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh reminder status to update cooldowns
                      refresh();
                    }
                  }
                ]
              );

            } catch (error) {
              console.error('Reminder error:', error);

              if (error instanceof Error && error.message.includes('cooldown')) {
                Alert.alert('Reminder Cooldown', error.message);
              } else {
                Alert.alert(
                  'Reminder Failed',
                  error instanceof Error ? error.message : 'Unable to send reminder. Please try again.'
                );
              }
            } finally {
              setReminderLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRemindAll = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (owedData.length === 0) {
      Alert.alert('No Outstanding Payments', 'No one owes you money at the moment.');
      return;
    }

    // Check if bulk reminder is on cooldown
    if (reminderStatus?.bulkCooldown) {
      Alert.alert(
        'Reminder Cooldown',
        `You can send bulk reminders again in ${reminderStatus.bulkCooldown.formattedTimeRemaining || 'some time'}.`
      );
      return;
    }

    // Get primary currency for display (most common currency in owedData)
    const currencies = owedData.map(item => item.currency);
    const primaryCurrency = currencies.find((currency, index) =>
      currencies.indexOf(currency) === index
    ) || 'SOL';

    Alert.alert(
      'Send Reminders',
      `Send payment reminders to all ${owedData.length} members who owe you $${totalOwedUSD.toFixed(2)} total?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send All',
          onPress: async () => {
            try {
              setReminderLoading(true);

              // Send bulk payment reminders using Firebase service
              const debtors = owedData.map(item => ({
                recipientId: item.memberId,
                amount: item.amount,
                name: item.name
              }));

              const result = await firebaseDataService.settlement.sendBulkPaymentReminders(
                actualGroupId.toString(),
                currentUser.id.toString(),
                debtors
              );

              Alert.alert(
                'Reminders Sent',
                result.message,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh reminder status to update cooldowns
                      refresh();
                    }
                  }
                ]
              );

            } catch (error) {
              console.error('Bulk reminder error:', error);

              if (error instanceof Error && error.message.includes('cooldown')) {
                Alert.alert('Reminder Cooldown', error.message);
              } else {
                Alert.alert(
                  'Reminders Failed',
                  error instanceof Error ? error.message : 'Unable to send reminders. Please try again.'
                );
              }
            } finally {
              setReminderLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!visible) {return null;}

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        // Always allow closing, but show warning if leaving group with outstanding balances
        if (isLeavingGroup && oweData.length > 0) {
          Alert.alert(
            'Outstanding Balances',
            'You still have outstanding balances to settle. You can close this modal and stay in the group.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Close Anyway', 
                style: 'default',
                onPress: () => {
                  // Animate out first, then close
                  Animated.parallel([
                    Animated.timing(translateY, {
                      toValue: SCREEN_HEIGHT,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                  ]).start(() => {
                    // Reset values after animation
                    translateY.setValue(0);
                    opacity.setValue(0);
                    
                    // Then close the modal (user stays in group)
                    if (onClose) {
                      onClose();
                    } else {
                      navigation.goBack();
                    }
                  });
                }
              }
            ]
          );
          return;
        }
        handleClose();
      }}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.modalContainer, { opacity }]}>
        <TouchableOpacity
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={() => {
            // Always allow closing, but show warning if leaving group with outstanding balances
            if (isLeavingGroup && oweData.length > 0) {
              Alert.alert(
                'Outstanding Balances',
                'You still have outstanding balances to settle. You can close this modal and stay in the group.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Close Anyway', 
                    style: 'default',
                    onPress: () => {
                      // Animate out first, then close
                      Animated.parallel([
                        Animated.timing(translateY, {
                          toValue: SCREEN_HEIGHT,
                          duration: 300,
                          useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                          toValue: 0,
                          duration: 300,
                          useNativeDriver: true,
                        }),
                      ]).start(() => {
                        // Reset values after animation
                        translateY.setValue(0);
                        opacity.setValue(0);
                        
                        // Then close the modal (user stays in group)
                        if (onClose) {
                          onClose();
                        } else {
                          navigation.goBack();
                        }
                      });
                    }
                  }
                ]
              );
              return;
            }
            handleClose();
          }}
        >
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Handle bar for slide down */}
              <View style={styles.handle} />

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#A5EA15" />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.content}
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator={false}
                  onScroll={(event) => {
                    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                    const paddingToBottom = 20;
                    const isCloseToBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
                    
                    if (isCloseToBottom) {
                      // Animate out and close modal when scrolled to bottom
                      Animated.parallel([
                        Animated.timing(translateY, {
                          toValue: SCREEN_HEIGHT,
                          duration: 300,
                          useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                          toValue: 0,
                          duration: 300,
                          useNativeDriver: true,
                        }),
                      ]).start(() => {
                        // Reset values
                        translateY.setValue(0);
                        opacity.setValue(0);
                        
                        // Always allow closing, but show warning if leaving group with outstanding balances
                        if (isLeavingGroup && oweData.length > 0) {
                          Alert.alert(
                            'Outstanding Balances',
                            'You still have outstanding balances to settle. You can close this modal and stay in the group.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Close Anyway', 
                                style: 'default',
                                onPress: () => {
                                  // Animate out first, then close
                                  Animated.parallel([
                                    Animated.timing(translateY, {
                                      toValue: SCREEN_HEIGHT,
                                      duration: 300,
                                      useNativeDriver: true,
                                    }),
                                    Animated.timing(opacity, {
                                      toValue: 0,
                                      duration: 300,
                                      useNativeDriver: true,
                                    }),
                                  ]).start(() => {
                                    // Reset values after animation
                                    translateY.setValue(0);
                                    opacity.setValue(0);
                                    
                                    // Then close the modal (user stays in group)
                                    if (onClose) {
                                      onClose();
                                    } else {
                                      navigation.goBack();
                                    }
                                  });
                                }
                              }
                            ]
                          );
                          return;
                        }
                        
                        // Then close the modal
                        if (onClose) {
                          onClose();
                        } else if (isLeavingGroup && leaveGroupCallback) {
                          // If this was opened for leaving group, call the callback
                          leaveGroupCallback();
                        } else {
                          navigation.goBack();
                        }
                      });
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {/* Show content only if there are debts to display */}
                  {(isOweSection || !isOweSection) && (currentSectionData.length > 0) ? (
                    <>
                      {/* Leave Group Header - shown when leaving group */}
                      {isLeavingGroup && (
                        <View style={styles.leaveGroupHeader}>
                          <Text style={styles.leaveGroupTitle}>
                            Settle Balances Before Leaving
                          </Text>
                          <Text style={styles.leaveGroupSubtitle}>
                            {oweData.length > 0 
                              ? `You owe $${oweData.reduce((sum, item) => sum + item.amountUSD, 0).toFixed(2)} to other members. You must settle all balances before leaving.`
                              : 'Please settle your outstanding balances before leaving the group'
                            }
                          </Text>
                        </View>
                      )}

                      {/* Amount Header - matching the image design */}
                      <View style={styles.amountHeader}>
                        <Text style={styles.amountHeaderText}>
                          {sectionLabel}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Image
                            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-white.png?alt=media&token=fb534b70-6bb8-4803-8bea-e8e60b1cd0cc' }}
                            style={styles.amountHeaderCurrency}
                          />
                          <Text style={styles.amountHeaderValue}>
                            {currentSectionTotal.toFixed(2)}
                          </Text>
                        </View>
                      </View>



                      {/* Settlement Cards - matching the image design */}
                      <View style={styles.settlementCards}>
                        {currentSectionData.map((item, index) => {
                          const userAvatar = userAvatars[item.memberId];

                          return (
                            <View key={index} style={styles.settlementCard}>
                              <View style={styles.settlementCardHeader}>
                                <View style={styles.settlementCardTitleBox}>
                                  {/* Avatar */}
                                  <View style={styles.settlementCardAvatar}>
                                    {userAvatar ? (
                                      <Image
                                        source={{ uri: userAvatar }}
                                        style={styles.settlementCardAvatarImage}
                                      />
                                    ) : (
                                      <UserAvatar
                                        displayName={item.name}
                                        size={40}
                                        style={styles.settlementCardAvatar}
                                      />
                                    )}
                                  </View>

                                  {/* Content */}
                                  <View style={styles.settlementCardContent}>
                                    <Text style={styles.settlementCardName}>
                                      {item.name}
                                    </Text>
                                    <Text style={styles.settlementCardStatus}>
                                      {isOweSection ? 'You owe' : 'You owe'}
                                    </Text>

                                  </View>

                                </View>
                                <Text style={styles.settlementCardQuestion}>
                                  Already settled ?
                                </Text>
                              </View>


                              {/* Amount and Button */}
                              <View style={styles.settlementCardAmountContainer}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                  <Image
                                    source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-white.png?alt=media&token=fb534b70-6bb8-4803-8bea-e8e60b1cd0cc' }}
                                    style={styles.settlementCardCurrency}
                                  />
                                  <Text style={styles.settlementCardAmount}>
                                    {item.amountUSD.toFixed(2)}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={[
                                    styles.settlementCardButton,
                                    (settlementLoading || reminderLoading) && { opacity: 0.6 }
                                  ]}
                                  onPress={() => {
                                    if (settlementLoading || reminderLoading) {return;}
                                    if (isOweSection) {
                                      handleIndividualSettlement(item);
                                    } else {
                                      handleSendReminder(item);
                                    }
                                  }}
                                  disabled={settlementLoading || reminderLoading}
                                >
                                  {(settlementLoading || reminderLoading) ? (
                                    <ActivityIndicator size="small" color="#000" />
                                  ) : (
                                    <Text style={styles.settlementCardButtonText}>
                                      Settleup
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {/* Scroll to close hint */}
                      <View style={styles.scrollToCloseHint}>
                        <Text style={styles.scrollToCloseText}>
                          Scroll down to close
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        {currentUserBalance?.status === 'settled'
                          ? 'All settled up!'
                          : 'No settlement data available'}
                      </Text>
                      {/* Debug info */}
                      <Text style={styles.debugTextSmall}>
                        Balances found: {groupBalances.length} |
                        Show owe: {isOweSection ? 'Yes' : 'No'} |
                        Show owed: {!isOweSection ? 'Yes' : 'No'}
                      </Text>
                      <Text style={styles.debugTextTiny}>
                        Owe data: {oweData.length} | Owed data: {owedData.length}
                      </Text>
                      {currentUserBalance && (
                        <Text style={styles.debugTextTiny}>
                          Current balance: {currentUserBalance.currency} {currentUserBalance.amount.toFixed(2)}
                          (${(Math.abs(currentUserBalance.amount) * (currentUserBalance.currency === 'SOL' ? 200 : currentUserBalance.currency === 'USDC' ? 1 : 100)).toFixed(2)})
                        </Text>
                      )}
                      {groupBalances.length > 0 && (
                        <Text style={styles.debugTextTiny}>
                          Group total: {group?.expenses_by_currency?.reduce((sum, exp) => sum + exp.total_amount, 0).toFixed(2)}
                          {group?.expenses_by_currency?.[0]?.currency}
                        </Text>
                      )}
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Bottom Action Button - fixed at bottom of screen */}
              {(isOweSection || !isOweSection) && currentSectionData.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.bottomActionButton,
                    (settlementLoading || reminderLoading) && { opacity: 0.6 }
                  ]}
                  onPress={async () => {
                    if (settlementLoading || reminderLoading) {return;}
                    if (isOweSection) {
                      handleSettleAll();
                    } else {
                      // Handle "Remind all" functionality
                      await handleRemindAll();
                    }
                  }}
                  disabled={settlementLoading || reminderLoading}
                >
                  {((settlementLoading && isOweSection) || (reminderLoading && !isOweSection)) ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.bottomActionButtonText}>
                      {isOweSection ? 'Settle all' : 'Remind all'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </Animated.View>
          </PanGestureHandler>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

export default SettleUpModal; 