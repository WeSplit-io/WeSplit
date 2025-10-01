/**
 * Fair Split Screen
 * Allows users to configure and manage fair bill splitting with equal or manual options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Participant {
  id: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountLocked: number;
  status: 'pending' | 'locked' | 'confirmed';
}

interface FairSplitScreenProps {
  navigation: any;
  route: any;
}

const FairSplitScreen: React.FC<FairSplitScreenProps> = ({ navigation, route }) => {
  const { billData } = route.params || {};
  
  console.log('FairSplitScreen received billData:', billData);
  
  const [splitMethod, setSplitMethod] = useState<'equal' | 'manual'>('equal');
  
  // Initialize participants from route params or use default data
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (billData?.participants && billData.participants.length > 0) {
      // Convert SplitDetailsScreen participants to FairSplitScreen format
      return billData.participants.map((p: any, index: number) => ({
        id: p.id || `participant_${index}`,
        name: p.name || `Participant ${index + 1}`,
        walletAddress: p.walletAddress || `${p.name?.substring(0, 4)}.....${Math.random().toString(36).substring(2, 6)}`,
        amountOwed: 0, // Will be calculated based on split method
        amountLocked: index < 2 ? 8.325 : 0, // Simulate some locked amounts
        status: index < 2 ? 'locked' : 'pending' as 'pending' | 'locked' | 'confirmed',
      }));
    }
    
    // Default participants if none provided
    return [
      { id: '1', name: 'PauluneMoon', walletAddress: 'B3gt.....sdgux', amountOwed: 8.325, amountLocked: 8.325, status: 'locked' },
      { id: '2', name: 'Haxxxoloto', walletAddress: 'C4ht.....kdfux', amountOwed: 8.325, amountLocked: 8.325, status: 'locked' },
      { id: '3', name: 'Rémi', walletAddress: 'D5iu.....jghux', amountOwed: 8.325, amountLocked: 0, status: 'pending' },
      { id: '4', name: 'Florian', walletAddress: 'E6jk.....lhiux', amountOwed: 8.325, amountLocked: 0, status: 'pending' },
    ];
  });

  const totalAmount = billData?.totalAmount || 65.6;
  const totalLocked = participants.reduce((sum, p) => sum + p.amountLocked, 0);
  const progressPercentage = Math.round((totalLocked / totalAmount) * 100);

  useEffect(() => {
    if (splitMethod === 'equal') {
      const amountPerPerson = totalAmount / participants.length;
      setParticipants(prev => 
        prev.map(p => ({ ...p, amountOwed: amountPerPerson }))
      );
    }
  }, [splitMethod, totalAmount, participants.length]);

  const handleSplitMethodChange = (method: 'equal' | 'manual') => {
    setSplitMethod(method);
  };

  const handleAmountChange = (participantId: string, amount: string) => {
    const newAmount = parseFloat(amount) || 0;
    setParticipants(prev =>
      prev.map(p => 
        p.id === participantId 
          ? { ...p, amountOwed: newAmount }
          : p
      )
    );
  };

  const handleConfirmSplit = () => {
    if (totalLocked < totalAmount) {
      Alert.alert(
        'Incomplete Payment',
        `Only ${progressPercentage}% of the bill has been locked. Please wait for all participants to send their payments.`
      );
      return;
    }

    // Navigate to payment confirmation screen
    navigation.navigate('PaymentConfirmation', {
      billData,
      participants,
      totalAmount,
      totalLocked,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'locked':
        return colors.green;
      case 'pending':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'locked':
        return 'Locked';
      case 'pending':
        return 'Pending';
      default:
        return 'Pending';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Fair Split</Text>
        
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Summary Card */}
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billIcon}>🧾</Text>
              <Text style={styles.billTitle}>{billData?.title || 'Restaurant Night'}</Text>
            </View>
            <Text style={styles.billDate}>10 Mar. 2025</Text>
          </View>
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <Text style={styles.billAmountUSDC}>{totalAmount} USDC</Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <View style={[styles.progressFill, { 
              transform: [{ rotate: `${(progressPercentage / 100) * 360}deg` }] 
            }]} />
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
              <Text style={styles.progressAmount}>{totalLocked} USDC</Text>
              <Text style={styles.progressLabel}>Locked</Text>
            </View>
          </View>
        </View>

        {/* Split Method Selection */}
        <View style={styles.splitMethodContainer}>
          <Text style={styles.splitMethodLabel}>Split between:</Text>
          <View style={styles.splitMethodOptions}>
            <TouchableOpacity
              style={[
                styles.splitMethodOption,
                splitMethod === 'equal' && styles.splitMethodOptionActive
              ]}
              onPress={() => handleSplitMethodChange('equal')}
            >
              <Text style={[
                styles.splitMethodOptionText,
                splitMethod === 'equal' && styles.splitMethodOptionTextActive
              ]}>
                Equal
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.splitMethodOption,
                splitMethod === 'manual' && styles.splitMethodOptionActive
              ]}
              onPress={() => handleSplitMethodChange('manual')}
            >
              <Text style={[
                styles.splitMethodOptionText,
                splitMethod === 'manual' && styles.splitMethodOptionTextActive
              ]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Participants List */}
        <View style={styles.participantsContainer}>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantCard}>
              <View style={styles.participantAvatar} />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantWallet}>{participant.walletAddress}</Text>
              </View>
              
              <View style={styles.participantAmountContainer}>
                {splitMethod === 'manual' ? (
                  <TextInput
                    style={styles.amountInput}
                    value={participant.amountOwed.toString()}
                    onChangeText={(text) => handleAmountChange(participant.id, text)}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                  />
                ) : (
                  <Text style={styles.participantAmount}>
                    ${participant.amountOwed.toFixed(3)}
                  </Text>
                )}
                <Text style={[styles.participantStatus, { color: getStatusColor(participant.status) }]}>
                  {getStatusText(participant.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Confirm Split Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.confirmButton,
            totalLocked < totalAmount && styles.confirmButtonDisabled
          ]} 
          onPress={handleConfirmSplit}
          disabled={totalLocked < totalAmount}
        >
          <Text style={[
            styles.confirmButtonText,
            totalLocked < totalAmount && styles.confirmButtonTextDisabled
          ]}>
            Confirm Split
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  editButton: {
    padding: spacing.sm,
  },
  editButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  billTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  billIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
  },
  billTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  billDate: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    opacity: 0.9,
  },
  billAmountContainer: {
    marginBottom: spacing.lg,
  },
  billAmountLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.xs,
  },
  billAmountUSDC: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: colors.green,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercentage: {
    color: colors.green,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  progressAmount: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  splitMethodContainer: {
    marginBottom: spacing.xl,
  },
  splitMethodLabel: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  splitMethodOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  splitMethodOption: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  splitMethodOptionActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  splitMethodOptionText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  splitMethodOptionTextActive: {
    color: colors.white,
  },
  participantsContainer: {
    marginBottom: spacing.xl,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    marginRight: spacing.md,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  participantWallet: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  participantAmountContainer: {
    alignItems: 'flex-end',
  },
  participantAmount: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  amountInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.white,
    fontSize: typography.fontSize.md,
    textAlign: 'right',
    minWidth: 80,
    marginBottom: spacing.xs,
  },
  participantStatus: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.black,
  },
  confirmButton: {
    backgroundColor: colors.green,
    borderRadius: 25,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surface,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  confirmButtonTextDisabled: {
    color: colors.textSecondary,
  },
});

export default FairSplitScreen;
