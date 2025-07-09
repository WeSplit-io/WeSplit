import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useGroupData } from '../../hooks/useGroupData';
import { settleGroupExpenses, sendPaymentReminder, sendBulkPaymentReminders, getReminderStatus, ReminderStatus } from '../../services/groupService';
import { GroupMember, Expense, Balance } from '../../types';
import { styles } from './styles';

interface SettleUpModalProps {
  visible?: boolean;
  onClose?: () => void;
  groupId?: string;
  navigation: any;
  route?: any;
  onSettlementComplete?: () => void;
}

const SettleUpModal: React.FC<SettleUpModalProps> = ({ visible = true, onClose, groupId, navigation, route, onSettlementComplete }) => {
  const actualGroupId = groupId || route?.params?.groupId;
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };
  
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
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  // Get computed values from group data
  const members = group?.members || [];
  const expenses = group?.expenses || [];

  // Fetch reminder status when group data is available
  useEffect(() => {
    const fetchReminderStatus = async () => {
      if (!visible || !group?.id || !currentUser?.id) return;
      
      try {
        const status = await getReminderStatus(group.id.toString(), currentUser.id.toString());
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
    if (!visible || !reminderStatus) return;

    const hasActiveCooldowns = 
      Object.keys(reminderStatus.individualCooldowns).length > 0 || 
      reminderStatus.bulkCooldown !== null;

    if (!hasActiveCooldowns) return;

    const interval = setInterval(() => {
      if (group?.id && currentUser?.id) {
        getReminderStatus(group.id.toString(), currentUser.id.toString())
          .then(setReminderStatus)
          .catch(err => console.error('Error refreshing reminder status:', err));
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [visible, reminderStatus, group?.id, currentUser?.id]);

  // Calculate real settlement data based on expenses using centralized method
  const groupBalances = getGroupBalances(actualGroupId);
  
  // Get current user's balance and determine who they owe/are owed by
  const currentUserId = Number(currentUser?.id);
  const currentUserBalance = groupBalances.find((balance: Balance) => balance.userId === currentUserId);

  // Calculate what current user owes to others and who owes current user
  const oweData: Array<{ name: string; amount: number; currency: string; memberId: number }> = [];
  const owedData: Array<{ name: string; amount: number; currency: string; memberId: number }> = [];

  // Process each member's balance
  groupBalances
    .filter((balance: Balance) => balance.userId !== currentUserId)
    .forEach((balance: Balance) => {
      const member = members.find(m => m.id === balance.userId);
      if (!member) return;

      if (balance.status === 'owes' && currentUserBalance?.status === 'gets_back') {
        // This member owes money and current user is owed money
        // Current user should receive money from this member
        owedData.push({ 
          name: member.name, 
          amount: Math.abs(balance.amount), 
          currency: balance.currency,
          memberId: member.id 
        });
      } else if (balance.status === 'gets_back' && currentUserBalance?.status === 'owes') {
        // This member is owed money and current user owes money
        // Current user should pay this member
        oweData.push({ 
          name: member.name, 
          amount: Math.abs(currentUserBalance.amount),
          currency: currentUserBalance.currency,
          memberId: member.id 
        });
      }
    });

  const totalOwe = oweData.reduce((sum, item) => sum + item.amount, 0);
  const totalOwed = owedData.reduce((sum, item) => sum + item.amount, 0);

  // Determine which section to show based on user's net balance
  const showOweSection = currentUserBalance?.status === 'owes'; // Show "You owe" if user owes money
  const showOwedSection = currentUserBalance?.status === 'gets_back'; // Show "We owe you" if user is owed money
  
  // Data and labels for the current section
  const currentSectionData = showOweSection ? oweData : owedData;
  const currentSectionTotal = showOweSection ? totalOwe : totalOwed;
  const sectionLabel = showOweSection ? 'You owe' : 'We owe you';
  const isOweSection = showOweSection;

  // Settlement handling functions
  const handleIndividualSettlement = async (memberData: { name: string; amount: number; currency: string; memberId: number }) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Find the member data for the contact
    const memberContact = members.find(member => member.id === memberData.memberId);
    if (!memberContact) {
      Alert.alert('Error', 'Member information not found');
      return;
    }

    // Close the modal first
    onClose?.();

    // Navigate to Send flow with pre-filled settlement data
    navigation.navigate('SendAmount', {
      contact: {
        id: memberContact.id,
        name: memberContact.name,
        email: memberContact.email,
        wallet_address: memberContact.wallet_address,
        isFavorite: false,
        first_met_at: memberContact.joined_at,
        mutual_groups_count: 1
      },
      groupId: actualGroupId,
      prefilledAmount: memberData.amount,
      prefilledNote: `Settlement payment to ${memberData.name} for group expenses`,
      isSettlement: true
    });
  };

  const handleSettleAll = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (totalOwe <= 0) {
      Alert.alert('No Debts', 'You don\'t have any outstanding debts to settle.');
      return;
    }

    // Get the currency from the current user's balance
    const primaryCurrency = currentUserBalance?.currency || 'SOL';

    Alert.alert(
      'Confirm Settle All',
      `Settle all outstanding debts totaling ${primaryCurrency} ${totalOwe.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle All',
          onPress: async () => {
            try {
              setSettlementLoading(true);
              
              const result = await settleGroupExpenses(
                actualGroupId.toString(),
                currentUser.id.toString(),
                'individual' // Backend handles settling all user's debts with this
              );

              Alert.alert(
                'Settlement Successful',
                `Successfully settled all debts totaling ${primaryCurrency} ${totalOwe.toFixed(2)}`,
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

  const handleMarkAsSettled = (memberData: { name: string; amount: number; currency: string; memberId: number }) => {
    Alert.alert(
      'Mark as Settled',
      `Mark ${memberData.currency} ${memberData.amount.toFixed(2)} with ${memberData.name} as already settled?`,
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

  const handleSendReminder = async (memberData: { name: string; amount: number; currency: string; memberId: number }) => {
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
      `Send payment reminder to ${memberData.name} for ${memberData.currency} ${memberData.amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setReminderLoading(true);
              
              const result = await sendPaymentReminder(
                actualGroupId.toString(),
                currentUser.id.toString(),
                memberData.memberId.toString(),
                memberData.amount
              );

              Alert.alert(
                'Reminder Sent',
                `Payment reminder sent to ${result.recipientName} for ${memberData.currency} ${result.amount.toFixed(2)}.`,
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
      `Send payment reminders to all ${owedData.length} members who owe you ${primaryCurrency} ${totalOwed.toFixed(2)} total?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send All',
          onPress: async () => {
            try {
              setReminderLoading(true);
              
              // Prepare debtors data for bulk reminder
              const debtors = owedData.map(item => ({
                recipientId: item.memberId.toString(),
                amount: item.amount,
                name: item.name
              }));

              const result = await sendBulkPaymentReminders(
                actualGroupId.toString(),
                currentUser.id.toString(),
                debtors
              );

              const successCount = result.results.filter((r: any) => r.success).length;
              
              Alert.alert(
                'Reminders Sent',
                `Payment reminders sent to ${successCount} of ${owedData.length} members about ${primaryCurrency} ${result.totalAmount.toFixed(2)} total.`,
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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="x" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A5EA15" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Show content only if there are debts to display */}
            {(showOweSection || showOwedSection) ? (
              <>
                {/* Amount Header */}
                <View style={[
                  styles.amountHeader, 
                  isOweSection ? styles.amountHeaderRed : styles.amountHeaderGreen
                ]}>
                  <Text style={styles.amountHeaderText}>
                    {sectionLabel}
                  </Text>
                  <Text style={styles.amountHeaderValue}>
                    {currentUserBalance?.currency || 'SOL'} {currentSectionTotal.toFixed(2)}
                  </Text>
                </View>

                {/* Settlement Cards */}
                <View style={styles.settlementCards}>
                  {currentSectionData.map((item, index) => (
                    <View key={index} style={styles.settlementCard}>
                      <View style={styles.settlementCardHeader}>
                        <Text style={styles.settlementCardTitle}>
                          {isOweSection ? `You owe to ${item.name}` : `${item.name} owe you`}
                        </Text>
                        <Text style={styles.settlementCardAmount}>
                          {item.currency} {item.amount.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.settlementActions}>
                        <TouchableOpacity 
                          style={[
                            styles.primaryButton, 
                            (settlementLoading || reminderLoading) && styles.disabledButton,
                            !isOweSection && reminderStatus?.individualCooldowns[item.memberId] && styles.disabledButton
                          ]}
                          onPress={() => {
                            if (settlementLoading || reminderLoading) return;
                            if (isOweSection) {
                              handleIndividualSettlement(item);
                            } else {
                              handleSendReminder(item);
                            }
                          }}
                          disabled={settlementLoading || reminderLoading || (!isOweSection && !!reminderStatus?.individualCooldowns[item.memberId])}
                        >
                          {(settlementLoading || reminderLoading) ? (
                            <ActivityIndicator size="small" color="#212121" />
                          ) : (
                            <Text style={styles.primaryButtonText}>
                              {isOweSection ? 'Settleup' : 
                               reminderStatus?.individualCooldowns[item.memberId] ? 'Remind in 24h' : 'Remind'}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.secondaryButton, settlementLoading && styles.disabledButton]}
                          onPress={() => {
                            if (settlementLoading) return;
                            handleMarkAsSettled(item);
                          }}
                          disabled={settlementLoading}
                        >
                          <Text style={styles.secondaryButtonText}>Already settled</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>All settled up!</Text>
              </View>
            )}

            {/* Bottom Action Button - only show if there are items to act upon */}
            {(showOweSection || showOwedSection) && (
              <TouchableOpacity 
                style={[
                  styles.bottomActionButton, 
                  (settlementLoading || reminderLoading) && styles.disabledButton,
                  !isOweSection && reminderStatus?.bulkCooldown && styles.disabledButton
                ]}
                onPress={async () => {
                  if (settlementLoading || reminderLoading) return;
                  if (isOweSection) {
                    handleSettleAll();
                  } else {
                    // Handle "Remind all" functionality
                    await handleRemindAll();
                  }
                }}
                disabled={settlementLoading || reminderLoading || (!isOweSection && !!reminderStatus?.bulkCooldown)}
              >
                {((settlementLoading && isOweSection) || (reminderLoading && !isOweSection)) ? (
                  <ActivityIndicator size="small" color="#212121" />
                ) : (
                  <Text style={styles.bottomActionButtonText}>
                    {isOweSection ? 'Settle all' : 
                     reminderStatus?.bulkCooldown ? `Remind all in ${reminderStatus.bulkCooldown.formattedTimeRemaining}` : 'Remind all'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default SettleUpModal; 