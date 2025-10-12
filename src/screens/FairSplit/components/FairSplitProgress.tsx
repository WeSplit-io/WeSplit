/**
 * Fair Split Progress Component
 * Displays completion progress and statistics
 */

import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { typography } from '@theme/typography';
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
}

const FairSplitProgress: React.FC<FairSplitProgressProps> = ({
  completionData,
  totalAmount,
  isLoading = false
}) => {
  const displayData = completionData || {
    completionPercentage: 0,
    totalAmount,
    collectedAmount: 0,
    remainingAmount: totalAmount,
    participantsPaid: 0,
    totalParticipants: 0
  };

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressCircle}>
        <View style={styles.progressInner}>
          <Text style={styles.progressPercentage}>
            {displayData.completionPercentage}%
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
