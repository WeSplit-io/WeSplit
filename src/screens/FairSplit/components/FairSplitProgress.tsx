/**
 * Fair Split Progress Component
 * Displays completion progress and statistics
 */

import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { styles } from '../styles';

interface CompletionData {
  completionPercentage: number;
  totalAmount: number;
  collectedAmount: number;
  remainingAmount: number;
  participantsPaid: number;
  totalParticipants: number;
}

interface FairSplitProgressProps {
  completionData: CompletionData | null;
  totalAmount: number;
  isLoading?: boolean;
  splitWallet?: any; // CRITICAL: Fallback to calculate from split wallet if completionData is null
}

const FairSplitProgress: React.FC<FairSplitProgressProps> = ({
  completionData,
  totalAmount,
  isLoading = false,
  splitWallet
}) => {
  // CRITICAL: If completionData is null, calculate from split wallet (source of truth)
  let displayData: CompletionData;
  if (completionData) {
    displayData = completionData;
  } else if (splitWallet?.participants) {
    // Calculate from split wallet participants
    const collectedAmount = splitWallet.participants.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);
    const participantsPaid = splitWallet.participants.filter((p: any) => p.status === 'paid' || (p.amountPaid || 0) >= (p.amountOwed || 0)).length;
    const totalParticipants = splitWallet.participants.length;
    const rawCompletionPercentage = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;
    const completionPercentage = Math.min(100, Math.max(0, rawCompletionPercentage));
    
    displayData = {
      completionPercentage,
      totalAmount: totalAmount || splitWallet.totalAmount || 0,
      collectedAmount,
      remainingAmount: Math.max(0, (totalAmount || splitWallet.totalAmount || 0) - collectedAmount),
      participantsPaid,
      totalParticipants
    };
  } else {
    // Fallback to defaults
    displayData = {
      completionPercentage: 0,
      totalAmount,
      collectedAmount: 0,
      remainingAmount: totalAmount,
      participantsPaid: 0,
      totalParticipants: 0
    };
  }

  // CRITICAL: Cap completion percentage at 100% to prevent display issues
  const cappedPercentage = Math.min(100, Math.max(0, displayData.completionPercentage));
  
  // Calculate rotation for progress fill (0% = -90deg, 100% = 270deg)
  const rotationAngle = (cappedPercentage / 100) * 360 - 90;
  
  // For 100% completion, show full green circle
  const isComplete = cappedPercentage >= 100;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressCircle}>
        {/* Progress fill overlay */}
        {displayData.completionPercentage > 0 && (
          <View 
            style={[
              styles.progressFill,
              isComplete ? styles.progressFillComplete : {},
              { transform: [{ rotate: `${rotationAngle}deg` }] }
            ]}
          />
        )}
        <View style={styles.progressInner}>
          <Text style={styles.progressPercentage}>
            {Math.round(cappedPercentage)}%
          </Text>
          <Text style={styles.progressAmount}>
            {displayData.collectedAmount.toFixed(2)} USDC
          </Text>
          <Text style={styles.progressLabel}>
            Collected
          </Text>
        </View>
      </View>
      
      {/* Progress Details */}
      <View style={{
        marginTop: 16,
        width: '100%',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <Text style={{
            color: '#888',
            fontSize: 14,
            fontWeight: '500',
          }}>Total Amount:</Text>
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
          }}>{displayData.totalAmount.toFixed(2)} USDC</Text>
        </View>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <Text style={{
            color: '#888',
            fontSize: 14,
            fontWeight: '500',
          }}>Collected:</Text>
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
          }}>{displayData.collectedAmount.toFixed(2)} USDC</Text>
        </View>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <Text style={{
            color: '#888',
            fontSize: 14,
            fontWeight: '500',
          }}>Remaining:</Text>
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
          }}>{displayData.remainingAmount.toFixed(2)} USDC</Text>
        </View>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <Text style={{
            color: '#888',
            fontSize: 14,
            fontWeight: '500',
          }}>Participants Paid:</Text>
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
          }}>{displayData.participantsPaid} / {displayData.totalParticipants}</Text>
        </View>
      </View>
    </View>
  );
};

export default FairSplitProgress;
